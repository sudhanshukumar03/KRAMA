export function trustedProxyAddresses(value = ''): string[] | false {
  const addresses = value.split(',').map(address => address.trim()).filter(Boolean);
  return addresses.length ? addresses : false;
}
