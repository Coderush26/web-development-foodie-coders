export const authUserStatusValues = {
  invited: "invited",
  active: "active",
  disabled: "disabled",
} as const;

export type AuthUserStatus = (typeof authUserStatusValues)[keyof typeof authUserStatusValues];

export const verificationKindValues = {
  memberInvite: "member_invite",
  emailVerify: "email_verify",
  passwordReset: "password_reset",
} as const;

export type VerificationKind = (typeof verificationKindValues)[keyof typeof verificationKindValues];
