import { hasDevanagariText, isHindiLanguage, transliterateToHindi } from "./transliterateHindi.js";

const clean = (value) => String(value || "").trim();

export { hasDevanagariText };

export const getDisplayCustomerName = (customer, language) => {
  if (!customer) return "-";

  const name = clean(customer.name);
  const nameHindi = clean(customer.nameHindi);

  if (isHindiLanguage(language)) {
    return nameHindi || transliterateToHindi(name) || name || "-";
  }

  return name || nameHindi || "-";
};

export const getCustomerName = getDisplayCustomerName;

export const getCustomerAddress = (customer, language) => {
  if (!customer) return "";

  const address = clean(customer.address);
  const addressHindi = clean(customer.addressHindi);

  if (isHindiLanguage(language) && addressHindi) return addressHindi;
  return address || addressHindi;
};
