// TOTP generator for the Atlassian e2e login (mirrors conf-app's otp helper). ATLASSIAN_OTP is the shared TOTP
// secret of the e2e test account.
import { TOTP } from 'otpauth';
import { E2E } from './env';

export function generateOtp(): string {
  return new TOTP({ issuer: 'Atlassian', label: 'Atlassian', algorithm: 'SHA1', digits: 6, period: 30, secret: E2E.otpSecret }).generate();
}
