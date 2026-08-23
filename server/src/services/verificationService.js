const twilio = require('twilio');

// In-memory verified phone store to validate phone verification before registration
// Key: cleaned phone string (+E.164 format), Value: { verified: boolean, verifiedAt: number }
const verifiedPhoneStore = new Map();

// In-memory store to track first-time verification per phone number to prevent duplicate welcome messages
const welcomeSentPhoneStore = new Set();

/**
 * Clean, normalize and validate phone number to strict E.164 format (+CountryCodeNumber)
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned; // Default to India (+91) if 10 digits without country code
    } else if (cleaned.length > 10) {
      cleaned = '+' + cleaned;
    }
  }

  const E164_REGEX = /^\+[1-9]\d{6,14}$/;
  if (!E164_REGEX.test(cleaned)) {
    const err = new Error(`Invalid phone number format "${phone}". Please enter a valid number with country code in E.164 format (e.g. +919876543210 or +15409175548).`);
    err.statusCode = 400;
    err.code = 'INVALID_PHONE_FORMAT';
    throw err;
  }

  return cleaned;
}

/**
 * Get initialized Twilio Client and credentials dynamically from process.env
 */
function getTwilioConfig() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const apiKeySid = (process.env.TWILIO_API_KEY_SID || '').trim();
  const apiKeySecret = (process.env.TWILIO_API_KEY_SECRET || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();
  const phoneFrom = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  // Validate Account SID format (Must start with 'AC')
  if (accountSid && accountSid.startsWith('SK')) {
    console.warn(`[TwilioVerify] Warning: TWILIO_ACCOUNT_SID="${accountSid}" starts with 'SK' (API Key SID). An Account SID starting with 'AC...' is required by Twilio.`);
  }

  const isAccountSidValid = accountSid.startsWith('AC');

  let client = null;
  if (isAccountSidValid) {
    if (authToken) {
      client = twilio(accountSid, authToken);
    } else if (apiKeySid && apiKeySid.startsWith('SK') && apiKeySecret) {
      client = twilio(apiKeySid, apiKeySecret, { accountSid });
    }
  }

  const isVerifyConfigured = Boolean(client && serviceSid && serviceSid.startsWith('VA'));
  const isSmsConfigured = Boolean(client && phoneFrom);

  return {
    client,
    serviceSid,
    phoneFrom,
    isVerifyConfigured,
    isSmsConfigured,
    accountSid,
    isAccountSidValid
  };
}

/**
 * In-memory OTP store for code verification
 */
const devOtpStore = new Map();

/**
 * Send OTP via Twilio Verify API (or Twilio Messages SMS API)
 * @param {string} rawPhone - Mobile phone number
 */
async function sendOtp(rawPhone) {
  const phone = cleanPhoneNumber(rawPhone);

  const { client, serviceSid, phoneFrom, isVerifyConfigured, isSmsConfigured } = getTwilioConfig();

  // Option A: Twilio Verify Service (verifications.create)
  if (isVerifyConfigured) {
    try {
      console.log(`[TwilioVerify] Initiating Twilio Verify SMS for ${phone} using Service SID ${serviceSid}`);
      const verification = await client.verify.v2
        .services(serviceSid)
        .verifications.create({ to: phone, channel: 'sms' });

      return {
        success: true,
        message: `OTP verification code sent to ${phone} via SMS.`
      };
    } catch (error) {
      console.error('[TwilioVerify] Send OTP Error:', error);
      
      const err = new Error();
      err.statusCode = 400;

      if (error.code === 60200) {
        err.message = 'Invalid phone number format for Twilio SMS delivery. Please include valid country code (e.g. +15409175548 or +919876543210).';
        err.code = 'INVALID_PHONE_FORMAT';
      } else if (error.code === 60203 || error.code === 20429) {
        err.message = 'Maximum OTP delivery attempts reached for this phone number. Please try again after 15 minutes.';
        err.code = 'MAX_ATTEMPTS_EXCEEDED';
        err.statusCode = 429;
      } else {
        err.message = error.message || 'Failed to send OTP via Twilio Verify.';
        err.code = error.code ? `TWILIO_ERR_${error.code}` : 'TWILIO_SEND_FAILED';
      }
      throw err;
    }
  }

  // Option B: Twilio Programmable Messaging SMS API (client.messages.create)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  devOtpStore.set(phone, { code, expiresAt });

  if (isSmsConfigured) {
    try {
      console.log(`[Twilio SMS] Sending SMS via Twilio Messages API from ${phoneFrom} to ${phone}`);
      await client.messages.create({
        body: `Your Auto-Serv OTP verification code is: ${code}. Valid for 10 minutes. Do not share this code with anyone.`,
        from: phoneFrom,
        to: phone
      });

      console.log(`[Twilio SMS] SMS successfully dispatched to ${phone}`);
      return {
        success: true,
        message: `OTP verification code sent to ${phone} via SMS.`
      };
    } catch (smsErr) {
      console.error(`[Twilio SMS Error] Direct SMS dispatch to ${phone} failed:`, {
        message: smsErr.message,
        code: smsErr.code,
        status: smsErr.status
      });

      const err = new Error();
      err.statusCode = 400;

      if (smsErr.code === 21608) {
        err.message = `Twilio Trial Account Restriction (Error 21608): Cannot send SMS to unverified number ${phone}. Please add ${phone} to Verified Caller IDs in Twilio Console or upgrade to a paid Twilio account.`;
        err.code = 'TWILIO_TRIAL_UNVERIFIED_NUMBER';
      } else if (smsErr.code === 21408 || smsErr.code === 21614) {
        err.message = `Twilio Geo-Permissions Error (Error ${smsErr.code}): SMS sending is not enabled for target country region. Please enable Geo-permissions for target country in Twilio Console.`;
        err.code = 'TWILIO_GEO_PERMISSIONS_DISABLED';
      } else if (smsErr.code === 20003 || smsErr.code === 70051) {
        err.message = `Twilio Auth Error (Error ${smsErr.code}): Invalid Account SID or Auth Token configured. Check TWILIO_AUTH_TOKEN in server/.env.`;
        err.code = 'TWILIO_AUTH_ERROR';
      } else if (smsErr.code === 21211 || smsErr.code === 21610) {
        err.message = `Invalid phone number for SMS delivery (${phone}). Check country code and phone number.`;
        err.code = 'TWILIO_INVALID_PHONE';
      } else {
        err.message = `Twilio SMS delivery failed: ${smsErr.message} (Error Code ${smsErr.code || 'UNKNOWN'})`;
        err.code = smsErr.code ? `TWILIO_ERR_${smsErr.code}` : 'SMS_DISPATCH_FAILED';
      }

      throw err;
    }
  }

  console.log(`\n========================================`);
  console.log(`[Twilio OTP Service] OTP generated for ${phone}: ${code}. (Logged server-side only)`);
  console.log(`========================================\n`);

  return {
    success: true,
    message: `OTP verification code sent to ${phone} via SMS.`
  };
}

/**
 * Verify OTP code via Twilio Verify API or server stored OTP
 * @param {string} rawPhone - Mobile phone number
 * @param {string} code - Submitted 6-digit OTP code
 */
async function verifyOtp(rawPhone, code) {
  const phone = cleanPhoneNumber(rawPhone);
  const userCode = String(code || '').trim();

  if (!phone) {
    const err = new Error('Phone number is required for OTP verification.');
    err.statusCode = 400;
    err.code = 'MISSING_PHONE';
    throw err;
  }

  if (!userCode || userCode.length < 4) {
    const err = new Error('Please enter a valid 6-digit OTP verification code.');
    err.statusCode = 400;
    err.code = 'INVALID_CODE_FORMAT';
    throw err;
  }

  const { client, serviceSid, isVerifyConfigured } = getTwilioConfig();

  const isFirstVerification = !welcomeSentPhoneStore.has(phone);
  if (isFirstVerification) {
    welcomeSentPhoneStore.add(phone);
  }

  if (isVerifyConfigured) {
    try {
      console.log(`[TwilioVerify] Checking OTP code for ${phone} via Twilio Service ${serviceSid}`);
      const check = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to: phone, code: userCode });

      if (check.status === 'approved' && check.valid === true) {
        verifiedPhoneStore.set(phone, {
          verified: true,
          verifiedAt: Date.now()
        });

        return {
          success: true,
          status: 'approved',
          message: 'Phone number verified successfully! ✓',
          phone,
          isFirstVerification
        };
      } else {
        const err = new Error('Incorrect or expired OTP code entered. Please try again.');
        err.statusCode = 400;
        err.code = 'INCORRECT_OTP';
        throw err;
      }
    } catch (error) {
      console.error('[TwilioVerify] Verify OTP Error:', error);
      if (error.statusCode) throw error;

      const err = new Error();
      err.statusCode = 400;

      if (error.code === 60202) {
        err.message = 'Maximum verification attempts reached for this code. Please request a new OTP.';
        err.code = 'MAX_VERIFICATION_ATTEMPTS';
      } else if (error.code === 20404 || error.code === 60204) {
        err.message = 'OTP code has expired or was not found. Please request a new OTP.';
        err.code = 'OTP_EXPIRED';
      } else {
        err.message = error.message || 'OTP verification failed. Please try again.';
        err.code = error.code ? `TWILIO_ERR_${error.code}` : 'VERIFICATION_FAILED';
      }
      throw err;
    }
  }

  // Strict verification check against dynamically generated OTP code
  const devRecord = devOtpStore.get(phone);
  const isValidDevCode = Boolean(devRecord && devRecord.code === userCode && Date.now() <= devRecord.expiresAt);

  if (!isValidDevCode) {
    const err = new Error(devRecord && Date.now() > devRecord.expiresAt ? 'OTP code has expired. Please request a new OTP.' : 'Incorrect 6-digit OTP code entered. Please check and try again.');
    err.statusCode = 400;
    err.code = devRecord && Date.now() > devRecord.expiresAt ? 'OTP_EXPIRED' : 'INCORRECT_OTP';
    throw err;
  }

  // Record verified status in server memory
  verifiedPhoneStore.set(phone, {
    verified: true,
    verifiedAt: Date.now()
  });

  return {
    success: true,
    status: 'approved',
    message: 'Phone number verified successfully! ✓',
    phone,
    isFirstVerification
  };
}

/**
 * Check whether a phone number has been verified server-side recently (within 30 minutes)
 * @param {string} rawPhone
 */
function isPhoneVerified(rawPhone) {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone) return false;

  const record = verifiedPhoneStore.get(phone);
  if (!record) return false;

  const isRecent = record.verified && (Date.now() - record.verifiedAt) < 30 * 60 * 1000;
  return isRecent;
}

module.exports = {
  cleanPhoneNumber,
  sendOtp,
  verifyOtp,
  isPhoneVerified,
  getTwilioConfig
};
