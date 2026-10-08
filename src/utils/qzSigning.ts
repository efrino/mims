import qz from 'qz-tray';
import jsrsasign from 'jsrsasign';

// Make jsrsasign functions globally available for QZ Tray
const { KEYUTIL, KJUR, stob64, hextorstr } = jsrsasign;

// Certificate and private key for QZ Tray signing
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDqDCCApCgAwIBAgIUOza99eR17InvV1x+83oPHSjCIzIwDQYJKoZIhvcNAQEL
BQAwYzELMAkGA1UEBhMCSUQxEzARBgNVBAgMCkphd2EgQmFyYXQxDzANBgNVBAcM
BkJla2FzaTEMMAoGA1UECgwDTUFKMQwwCgYDVQQLDANEZXYxEjAQBgNVBAMMCWxv
Y2FsaG9zdDAeFw0yNTExMjYxMTEzMjVaFw0zNTExMjQxMTEzMjVaMGMxCzAJBgNV
BAYTAklEMRMwEQYDVQQIDApKYXdhIEJhcmF0MQ8wDQYDVQQHDAZCZWthc2kxDDAK
BgNVBAoMA01BSjEMMAoGA1UECwwDRGV2MRIwEAYDVQQDDAlsb2NhbGhvc3QwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDHhCh2DArm4SDqK0x7USdYr3Fj
Zru8mh5qiYrw2Ip8Uqsy/FAtgGvvKsMYj8WoU329a+5wKQWz3LdgYAscE7hkzt/8
DjjvieDpa4pNs8+3U6gTFFsybZob3Y93HwBNIW61NQAOn6WGuVZhbAuQLU3LRX/h
o3YIS1ESmDU5kTS1FBy8GSxx+GSzn0TekdHxjB/zArUgLb5+/ys3lY/ET8xN/WgO
V7TpethygR8nLIR6oWhhaVan/+A183OKwJsOyG4Vb7IbXkv1kfY74DmiKXM/uyV4
7PCtfv+qfpAQFdDysMFs1Y7N3U5GkwoiXA5kvomKCkijhI3alg/KurA2BkVBAgMB
AAGjVDBSMCAGA1UdEQQZMBeCCWxvY2FsaG9zdIcEfwAAAYcEwKgKQzAPBgNVHRMB
Af8EBTADAQH/MB0GA1UdDgQWBBTQvTFzUrjTVMVK1GKP8aDpAfMCWTANBgkqhkiG
9w0BAQsFAAOCAQEATe0WRriimYCpUV9MTk/BQiUmHJv1e1zSGkSOchbej/ATJ8gV
6nezGxs3vBeZaYBpN/NJ+RBRskrDGdIkulgaO5Hx/uLVGDRUjQoBV0PgQ2zT7FdH
k2fAVcrGeUshcpP/WzWSvTuzBxei5pBL3gm1ovtfu6uOcFABbgGxggY5IbO5+dpi
pGZXaEBFxo/rF8KmLVBy+7mJklivU+4ltYf5mzUyewtK3BDlZDp+wmaaTskFNIag
TAWOhIW5a4peUZn/AUJqY+O0z5Y7XxvjV13gI44RPodzz5HGN2veHDZeDv4zg2TV
ugznpoyu+KQdBmrY4BohPK9G923SjHq0EbawXw==
-----END CERTIFICATE-----`;

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDHhCh2DArm4SDq
K0x7USdYr3FjZru8mh5qiYrw2Ip8Uqsy/FAtgGvvKsMYj8WoU329a+5wKQWz3Ldg
YAscE7hkzt/8DjjvieDpa4pNs8+3U6gTFFsybZob3Y93HwBNIW61NQAOn6WGuVZh
bAuQLU3LRX/ho3YIS1ESmDU5kTS1FBy8GSxx+GSzn0TekdHxjB/zArUgLb5+/ys3
lY/ET8xN/WgOV7TpethygR8nLIR6oWhhaVan/+A183OKwJsOyG4Vb7IbXkv1kfY7
4DmiKXM/uyV47PCtfv+qfpAQFdDysMFs1Y7N3U5GkwoiXA5kvomKCkijhI3alg/K
urA2BkVBAgMBAAECgf8oO95s78DDDmM01cZ2l8b3e2nCQdVaEzpPAa2jJAfJSmJ7
xaXlhyA8+sKdEWEqsKuKp1lOBPfBbaENLlEPOGrW6WEB01xn8cYJTEZ3pOsebSBX
uKMraC7Lr8Jeo0HMTBGnOSjpygf3QyjIPKGYUYp+k2VWe0AyK/4NYeRZ145pdWmi
hJ4EyJdmyitOic9xfK81nb2nz9cmqbLtyVrKpKEMDFZLL6wfQfwNlL0PWXrutmnP
RienIAu59gT0a6L2Q62sewUflcu/3m0MWHIz05lNWZSI3lO4/1Goqs/LACzO8z/9
smnthAsiRWFTIwB4evJYxX8CAl+AQ3ZhwAssXuECgYEA6aknXjFbfBj7Nf+uK37P
5AHvwzqgQwOcc0HbXeifqluDpWkngM419bRvBeV4b+xVxx0iRHaNy0Lf+OOuDs0y
Dz/Y3lQ570uACRQPXbEMV4VWudNnzFMwq6WJUWQIgzRj1A7zRBFkPDbuqCfKHtQP
YjUUVkVWZYTYONo8MImsFBECgYEA2pdRQL5QvYlBJpD/lS7vqyk63LbNWPQ9psTU
rq5zKQ/4KlNAfPXN9uVqiCGne+myq7GuwzbgDQHrNaWC6JPmQWNeFFjoBDmt4Stt
teSarzwyLP5p7zaa+9hllaYp+cUeJhCqW3lCC72AXIuIQhfmuxhfezXc7WXM5bcI
edqljjECgYBSHO7HzEKhJspJXLPhdywprYCLtDOTuVYmrvMfWluZ65Uk8QI/4rfV
w/XsNYsQkhZG5fcf5iXIU5UQCzsk2nmIIGDfKOw/KuIwzorj2w9CRoqGvUNR675D
4+WQ472WFjgq0qIsvoviGU/fajQ+hzlswsiF1NIa1QeDWzYhvI/rcQKBgQCrT9/s
H7tjb8hRk13a6zgGKn/pLpLs3i3bH3OXmzzBt7REZ46o4HOUxeOh4M5D/Ll8efp/
H+ikCRbvqlFYOWFBacD3rV3YweOWDtUispDQORsRzCn1whPgwI2MpPdMusGQD4uT
uQqb7N5GqUwWkGjRxJ5AD8yfeSMF/VZ1OXh6YQKBgQCdisTWFzccDe73qwA2hybA
PPYUicwzLah6Onr3TFYDG9BljWD6EKxI7b7Xt823QaLCZA96lK3dVv+5AOVwwYOb
5h0mnqVXhIAnVJnE76ee4Jaux2sTEOIbi2kmKrFyU8b+8BF7+ggzm5zK2GSOn5JP
G1zCQfjmMU0OxCCQhPV68g==
-----END PRIVATE KEY-----`;

/**
 * Setup QZ Tray certificate signing
 */
function setupCertificateSigning() {
  qz.security.setCertificatePromise((resolve :any) => {
    resolve(CERTIFICATE);
  });

  qz.security.setSignatureAlgorithm("SHA512");

  qz.security.setSignaturePromise((toSign :any) => {
    return (resolve :any, reject :any) => {
      try {
        const pk = KEYUTIL.getKey(PRIVATE_KEY);
        const sig = new KJUR.crypto.Signature({ alg: "SHA512withRSA" });
        sig.init(pk);
        sig.updateString(toSign);
        const hex = sig.sign();
        resolve(stob64(hextorstr(hex)));
      } catch (err) {
        console.error(err);
        reject(err);
      }
    };
  });
}

/**
 * Connect to QZ Tray with signing enabled
 */
export async function connectQZTray() {
  try {
    if (!qz.websocket.isActive()) {
      // Setup certificate signing before connecting
      setupCertificateSigning();

      await qz.websocket.connect();
      // console.log('QZ Tray connected with certificate signing');
    }
    return true;
  } catch (error) {
    console.error('Error connecting to QZ Tray:', error);
    throw error;
  }
}

/**
 * Disconnect from QZ Tray
 */
export async function disconnectQZTray() {
  try {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
    }
  } catch (error) {
    console.error('Error disconnecting from QZ Tray:', error);
  }
}

/**
 * Get available printers
 */
export async function getQZPrinters() {
  try {
    await connectQZTray();
    const printers = await qz.printers.find();
    return printers;
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
}

export default {
  connectQZTray,
  disconnectQZTray,
  getQZPrinters
};
