// PII マスキングユーティリティ。AI API / ログに送る前段で必ず通す。

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? "*" : `${part[0]}${"*".repeat(part.length - 1)}`))
    .join(" ");
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
