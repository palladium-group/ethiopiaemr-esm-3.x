import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type Form } from '@openmrs/esm-patient-common-lib';
import { jsonSchemaResourceName } from '../../../constants';

export function useFormSchema(form?: Form) {
  const schemaResource = form?.resources?.find((resource) => resource.name === jsonSchemaResourceName);
  const schemaUuid = schemaResource?.valueReference;

  const { data: schema, isLoading } = useSWR(
    schemaUuid ? `form-schema/${schemaUuid}` : null,
    async () => {
      if (!schemaUuid) {
        return null;
      }
      try {
        // valueReference for JSON schema resource which is the CLOB UUID
        const response = await openmrsFetch(`/ws/rest/v1/clobdata/${schemaUuid}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch form schema', error);
        return null;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const conceptToLabelMap = new Map<string, string>();

  if (schema) {
    // Process pages > sections > questions
    schema.pages?.forEach((page) => {
      page.sections?.forEach((section) => {
        section.questions?.forEach((question) => {
          if (question.questionOptions?.concept) {
            conceptToLabelMap.set(question.questionOptions.concept, question.label);
          }
          // Handle questions within questions (e.g. obs groups provided as separate questions if any)
          // The typical structure is questions have 'questions' array for groups or just individual questions.
          // Let's recurse or check sub-questions if the schema structure supports it.
          // For now, flatten the structure as much as possible.
          if (question.questions) {
            question.questions.forEach((subQuestion) => {
              if (subQuestion.questionOptions?.concept) {
                conceptToLabelMap.set(subQuestion.questionOptions.concept, subQuestion.label);
              }
            });
          }
        });
      });
    });
  }

  return {
    conceptToLabelMap,
    isLoading,
  };
}
