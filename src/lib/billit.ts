import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";

const BILLIT_API_URL = "https://api.sandbox.billit.be";
const BILLIT_LOGIN_URL = "https://my.sandbox.billit.be/Account/Logon";
const BILLIT_TOKEN_URL = `${BILLIT_API_URL}/OAuth2/token`;

export type BillitConfig =
  | { partyId: string; authMode: "api_key"; apiKey: string }
  | { partyId: string; authMode: "oauth"; clientId: string; clientSecret: string; redirectUri: string };

export type BillitToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type BillitAdmin = ReturnType<typeof createAdminClient>;

export function getBillitConfig(): BillitConfig {
  const partyId = process.env.BILLIT_PARTY_ID?.trim();
  const apiKey = process.env.BILLIT_API_KEY?.trim();
  if (!partyId) throw new Error("BILLIT_PARTY_ID n’est pas configuré pour le Sandbox.");
  if (apiKey) return { partyId, apiKey, authMode: "api_key" };

  const clientId = process.env.BILLIT_CLIENT_ID?.trim();
  const clientSecret = process.env.BILLIT_CLIENT_SECRET?.trim();
  const redirectUri = process.env.BILLIT_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Configuration Billit Sandbox incomplète.");
  }

  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw new Error("BILLIT_REDIRECT_URI doit être une URL HTTPS publique.");
  }
  if (redirect.protocol !== "https:" || redirect.hostname === "localhost") {
    throw new Error("BILLIT_REDIRECT_URI doit être une URL HTTPS publique.");
  }

  return { clientId, clientSecret, redirectUri: redirect.toString(), partyId, authMode: "oauth" };
}

export function isBillitConfigured(): boolean {
  try {
    const config = getBillitConfig();
    if (config.authMode === "oauth") encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function createBillitAuthorizationUrl(state: string): string {
  const config = getBillitConfig();
  if (config.authMode !== "oauth" || !config.clientId || !config.redirectUri) {
    throw new Error("Une clé API Sandbox est configurée; le parcours OAuth n’est pas nécessaire.");
  }
  const url = new URL(BILLIT_LOGIN_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function encryptionKey(): Buffer {
  const encoded = process.env.BILLIT_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("BILLIT_TOKEN_ENCRYPTION_KEY n’est pas configurée.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("BILLIT_TOKEN_ENCRYPTION_KEY doit être une clé Base64 de 32 octets.");
  }
  return key;
}

export function encryptBillitToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptBillitToken(envelope: string): string {
  const [encodedIv, encodedTag, encodedCiphertext, extra] = envelope.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error("Jeton Billit chiffré invalide.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function requestToken(body: Record<string, string>): Promise<BillitToken> {
  const response = await fetch(BILLIT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
  } | null;

  if (!response.ok || typeof payload?.access_token !== "string" || typeof payload.refresh_token !== "string") {
    throw new Error("Billit n’a pas accordé de jeton Sandbox. Vérifiez les identifiants OAuth et l’URL de retour.");
  }

  const expiresIn = Number(payload.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("Réponse OAuth Billit invalide.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn,
  };
}

export async function exchangeBillitAuthorizationCode(code: string): Promise<BillitToken> {
  const config = getBillitConfig();
  if (config.authMode !== "oauth" || !config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("L’échange OAuth est indisponible avec le mode API key.");
  }
  return requestToken({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });
}

export async function refreshBillitToken(refreshToken: string): Promise<BillitToken> {
  const config = getBillitConfig();
  if (config.authMode !== "oauth" || !config.clientId || !config.clientSecret) {
    throw new Error("Le renouvellement OAuth est indisponible avec le mode API key.");
  }
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
}

export function getBillitApiUrl(path: string): URL {
  if (!path.startsWith("/v1/")) throw new Error("Route Billit invalide.");
  return new URL(path, BILLIT_API_URL);
}

async function getBillitAccessToken(admin: BillitAdmin): Promise<string> {
  const { data: connection, error } = await admin
    .from("billit_connections")
    .select("access_token_encrypted, refresh_token_encrypted, access_token_expires_at")
    .eq("singleton", true)
    .maybeSingle();
  if (error || !connection) throw new Error("Connecte d’abord un compte Billit Sandbox dans les paramètres.");

  if (Date.parse(connection.access_token_expires_at) > Date.now() + 60_000) {
    return decryptBillitToken(connection.access_token_encrypted);
  }

  const token = await refreshBillitToken(decryptBillitToken(connection.refresh_token_encrypted));
  const { error: updateError } = await admin
    .from("billit_connections")
    .update({
      access_token_encrypted: encryptBillitToken(token.accessToken),
      refresh_token_encrypted: encryptBillitToken(token.refreshToken),
      access_token_expires_at: new Date(Date.now() + token.expiresIn * 1000).toISOString(),
    })
    .eq("singleton", true);
  if (updateError) throw new Error("Le jeton Sandbox a été renouvelé mais son stockage a échoué. Reconnecte Billit.");
  return token.accessToken;
}

export async function callBillitApi<T>(
  admin: BillitAdmin,
  path: string,
  options: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {}
): Promise<T> {
  const config = getBillitConfig();
  const authorizationHeaders: Record<string, string> = config.authMode === "api_key"
    ? { ApiKey: config.apiKey }
    : { Authorization: `Bearer ${await getBillitAccessToken(admin)}` };
  const response = await fetch(getBillitApiUrl(path), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...authorizationHeaders,
      partyID: config.partyId,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as {
    errors?: { Code?: string; Description?: string }[];
  } | T | null;

  if (!response.ok) {
    const errors = payload && typeof payload === "object" && "errors" in payload && Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.Description || item.Code).filter(Boolean).join(" ")
      : "";
    throw new Error(errors || `Billit Sandbox a répondu avec le statut ${response.status}.`);
  }
  return payload as T;
}

export type BillitOrderStatus = {
  orderId: number;
  orderNumber: string | null;
  orderStatus: string | null;
  isSent: boolean;
  delivered: boolean | null;
};

export class BillitTestSendError extends Error {
  constructor(
    message: string,
    readonly orderId: number,
    readonly orderNumber: string
  ) {
    super(message);
    this.name = "BillitTestSendError";
  }
}

export async function getBillitOrderStatus(admin: BillitAdmin, orderId: number): Promise<BillitOrderStatus> {
  const order = await callBillitApi<{
    OrderID?: number | string;
    OrderNumber?: string;
    OrderStatus?: string;
    IsSent?: boolean;
    CurrentDocumentDeliveryDetails?: { IsDocumentDelivered?: boolean };
  }>(admin, `/v1/orders/${orderId}`);
  const returnedId = Number(order.OrderID);
  if (Number.isSafeInteger(returnedId) && returnedId !== orderId) {
    throw new Error("Billit a retourné un identifiant de facture inattendu.");
  }
  return {
    orderId,
    orderNumber: typeof order.OrderNumber === "string" ? order.OrderNumber : null,
    orderStatus: typeof order.OrderStatus === "string" ? order.OrderStatus : null,
    isSent: order.IsSent === true,
    delivered: typeof order.CurrentDocumentDeliveryDetails?.IsDocumentDelivered === "boolean"
      ? order.CurrentDocumentDeliveryDetails.IsDocumentDelivered
      : null,
  };
}

export async function createAndSendSandboxTestInvoice(admin: BillitAdmin) {
  const orderNumber = `DL-SANDBOX-${Date.now()}`;
  const date = new Date();
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + 14);
  const formatDate = (value: Date) => value.toISOString().slice(0, 10);

  const created = await callBillitApi<number | { OrderID?: number | string; ID?: number | string }>(admin, "/v1/orders", {
    method: "POST",
    body: {
      OrderType: "Invoice",
      OrderDirection: "Income",
      OrderNumber: orderNumber,
      OrderDate: formatDate(date),
      ExpiryDate: formatDate(dueDate),
      Currency: "EUR",
      Customer: {
        Name: "Decerf Lab - destinataire de test",
        PartyType: "Customer",
        Addresses: [{
          AddressType: "InvoiceAddress",
          Street: "Rue de test",
          StreetNumber: "1",
          City: "Bruxelles",
          Zipcode: "1000",
          CountryCode: "BE",
        }],
      },
      OrderLines: [{
        Quantity: 1,
        UnitPriceExcl: 1,
        Description: "Test technique Sandbox, ne pas comptabiliser",
        VATPercentage: 21,
      }],
    },
  });

  const orderId = Number(typeof created === "number" ? created : created?.OrderID ?? created?.ID);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    throw new Error("Billit a créé une réponse sans OrderID exploitable. Vérifie la commande dans le Sandbox avant toute relance.");
  }

  try {
    await callBillitApi(admin, "/v1/orders/commands/send", {
      method: "POST",
      body: { Transporttype: "Peppol", OrderIDs: [orderId] },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Erreur inconnue";
    throw new BillitTestSendError(
      `La facture test ${orderNumber} (OrderID ${orderId}) est créée dans Billit, mais son envoi Peppol a échoué : ${reason}`,
      orderId,
      orderNumber
    );
  }

  return { orderId, orderNumber };
}