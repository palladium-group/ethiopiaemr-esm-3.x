import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const PHONE_REGEX = /^\+?[\d\s\-()]+$/;
const MIN_PHONE_DIGITS = 9;
const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

const UserManagementFormSchema = (
  existingUsernames: Array<string>,
  isEdit?: boolean,
  shouldValidatePhoneEmail = true,
  isInitialValuesEmpty = true,
) => {
  const { t } = useTranslation();

  const userManagementFormSchema = z
    .object({
      givenName: z.string().nonempty(t('givenNameRequired', 'Given name is required')),
      middleName: z.string().optional(),
      familyName: z.string().nonempty(t('familyNameRequired', 'Family name is required')),
      gender: z.enum(['M', 'F'], {
        errorMap: () => ({
          message: t('genderRequired', 'Gender is required'),
        }),
      }),
      phoneNumber: shouldValidatePhoneEmail
        ? z
            .string()
            .optional()
            .refine(
              (val) => {
                if (!val || val.trim() === '') {
                  return true;
                }
                const digitsOnly = val.replace(/\D/g, '');
                return PHONE_REGEX.test(val) && digitsOnly.length >= MIN_PHONE_DIGITS;
              },
              { message: t('invalidPhoneNumber', 'Invalid phone number') },
            )
        : z.string().optional(),
      email: shouldValidatePhoneEmail
        ? z
            .string()
            .optional()
            .refine((val) => !val || val.trim() === '' || z.string().email().safeParse(val).success, {
              message: t('invalidEmail', 'Invalid email address'),
            })
        : z.string().optional(),
      providerIdentifiers: z.boolean().optional(),
      username: z
        .string()
        .optional()
        .transform((s) => s?.trim() ?? '')
        .pipe(
          z
            .string()
            .min(1, t('usernameRequired', 'Username is required'))
            .min(
              MIN_USERNAME_LENGTH,
              t('usernameMinLength', 'Username must be at least {{count}} characters', {
                count: MIN_USERNAME_LENGTH,
              }),
            )
            .refine((value) => !existingUsernames.includes(value), {
              message: t('usernameTaken', 'Username already exists'),
            }),
        ),
      password: isInitialValuesEmpty
        ? z
            .string()
            .optional()
            .transform((s) => s?.trim() ?? '')
            .pipe(
              z
                .string()
                .min(1, t('passwordRequired', 'Password is required'))
                .min(
                  MIN_PASSWORD_LENGTH,
                  t('passwordMinLength', 'Password must be at least {{count}} characters', {
                    count: MIN_PASSWORD_LENGTH,
                  }),
                )
                .refine((val) => /[a-z]/.test(val) && /[A-Z]/.test(val) && /[0-9]/.test(val), {
                  message: t(
                    'passwordCaseRequired',
                    'Password must contain at least one lowercase letter, one uppercase letter, and one number.',
                  ),
                }),
            )
        : z
            .string()
            .optional()
            .transform((s) => s?.trim() ?? ''),
      confirmPassword: isInitialValuesEmpty
        ? z
            .string()
            .optional()
            .transform((s) => s?.trim() ?? '')
            .pipe(z.string().min(1, t('confirmPasswordRequired', 'Please confirm your password')))
        : z
            .string()
            .optional()
            .transform((s) => s?.trim() ?? ''),
      roles: z
        .array(
          z.object({
            uuid: z.string().min(1, 'UUID is required'),
            display: z.string().min(1, 'Role name is required'),
            description: z.string().nullable().optional(),
          }),
        )
        .optional(),
      primaryRole: z.string().optional(),
      systemId: z.string().optional(),
      providerLicense: z.string().optional(),
      licenseExpiryDate: z.date().optional(),
      registrationNumber: z.string().optional(),
      qualification: z.string().optional(),
      nationalId: z.string().optional(),
      passportNumber: z.string().optional(),
      isEditProvider: z.boolean().optional(),
      providerUniqueIdentifier: z.string().optional(),
    })
    .refine((data) => !isInitialValuesEmpty || data.password === data.confirmPassword, {
      message: t('passwordsDoNotMatch', 'Passwords do not match'),
      path: ['confirmPassword'],
    })
    .superRefine((data, ctx) => {
      if (isInitialValuesEmpty) {
        return;
      }
      const p = (data.password ?? '').trim();
      const c = (data.confirmPassword ?? '').trim();
      if (!p && !c) {
        return;
      }
      if (!p) {
        ctx.addIssue({ code: 'custom', message: t('passwordRequired', 'Password is required'), path: ['password'] });
        return;
      }
      if (p.length < MIN_PASSWORD_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: t('passwordMinLength', 'Password must be at least {{count}} characters', {
            count: MIN_PASSWORD_LENGTH,
          }),
          path: ['password'],
        });
      }
      if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) {
        ctx.addIssue({
          code: 'custom',
          message: t(
            'passwordCaseRequired',
            'Password must contain at least one lowercase letter, one uppercase letter, and one number.',
          ),
          path: ['password'],
        });
      }
      if (!c) {
        ctx.addIssue({
          code: 'custom',
          message: t('confirmPasswordRequired', 'Please confirm your password'),
          path: ['confirmPassword'],
        });
      } else if (p !== c) {
        ctx.addIssue({
          code: 'custom',
          message: t('passwordsDoNotMatch', 'Passwords do not match'),
          path: ['confirmPassword'],
        });
      }
    });

  return { userManagementFormSchema };
};

export default UserManagementFormSchema;
