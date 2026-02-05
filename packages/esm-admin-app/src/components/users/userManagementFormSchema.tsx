import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const PHONE_REGEX = /^\+?[\d\s\-()]+$/;
const MIN_PHONE_DIGITS = 9;

const UserManagementFormSchema = (
  existingUsernames: Array<string>,
  isEdit?: boolean,
  shouldValidatePhoneEmail = true,
) => {
  const { t } = useTranslation();

  const userManagementFormSchema = z.object({
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
      .nonempty(t('usernameRequired', 'Username is required'))
      .refine((value) => !existingUsernames.includes(value), {
        message: t('usernameTaken', 'Username already exists'),
      }),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    forcePasswordChange: z.boolean().optional(),
    roles: z
      .array(
        z.object({
          uuid: z.string().min(1, 'UUI is required'),
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
  });

  return { userManagementFormSchema };
};

export default UserManagementFormSchema;
