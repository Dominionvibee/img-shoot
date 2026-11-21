const TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
const keyPattern = /^[A-Za-z0-9_-]{30,256}$/;
const localHost = host => host === 'localhost' || host.endsWith('.localhost')
  || host === '[::1]' || /^127\./.test(host);
const list = value => typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean) : [];
const validKey = value => typeof value === 'string' && keyPattern.test(value)
  && !/^(?:example|placeholder|replace[-_]?with|your[-_]|mock[-_]|test[-_])/i.test(value)
  && value !== TEST_SITE_KEY && value !== TEST_SECRET_KEY;

export function readRecaptchaConfig(env = process.env) {
  const siteKey = env.RECAPTCHA_SITE_KEY || '';
  const secretKey = env.RECAPTCHA_SECRET_KEY || '';
  const hostnames = list(env.RECAPTCHA_ALLOWED_HOSTNAMES);
  const origins = list(env.RECAPTCHA_ALLOWED_ORIGINS);
  const production = env.NODE_ENV === 'production';
  const hostsValid = hostnames.length > 0 && hostnames.every(host =>
    (host === '[::1]' || /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(host))
    && (!production || !localHost(host)));
  const originsValid = origins.length > 0 && origins.every(origin => {
    try {
      const url = new URL(origin);
      return origin === url.origin && ['http:', 'https:'].includes(url.protocol)
        && hostnames.includes(url.hostname) && !url.username && !url.password
        && (production ? url.protocol === 'https:' && !localHost(url.hostname)
          : url.protocol === 'https:' || localHost(url.hostname));
    } catch { return false; }
  });
  return Object.freeze({
    siteKey, secretKey, hostnames: new Set(hostnames), origins: new Set(origins),
    configured: validKey(siteKey) && validKey(secretKey) && siteKey !== secretKey && hostsValid && originsValid,
  });
}
