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
  const answerToLabelMap = new Map<string, string>();
  const fieldOrder: string[] = [];

  if (schema) {
    // Process pages > sections > questions
    schema.pages?.forEach((page) => {
      page.sections?.forEach((section) => {
        section.questions?.forEach((question) => {
          if (question.questionOptions?.concept) {
            conceptToLabelMap.set(question.questionOptions.concept, question.label);
            fieldOrder.push(question.questionOptions.concept);

            if (question.questionOptions.answers) {
              question.questionOptions.answers.forEach((answer) => {
                if (answer.concept) {
                  answerToLabelMap.set(`${question.questionOptions.concept}:${answer.concept}`, answer.label);
                }
              });
            }
          }
          if (question.questions) {
            question.questions.forEach((subQuestion) => {
              if (subQuestion.questionOptions?.concept) {
                conceptToLabelMap.set(subQuestion.questionOptions.concept, subQuestion.label);
                fieldOrder.push(subQuestion.questionOptions.concept);

                if (subQuestion.questionOptions.answers) {
                  subQuestion.questionOptions.answers.forEach((answer) => {
                    if (answer.concept) {
                      answerToLabelMap.set(`${subQuestion.questionOptions.concept}:${answer.concept}`, answer.label);
                    }
                  });
                }
              }
            });
          }
        });
      });
    });
  }

  return {
    conceptToLabelMap,
    answerToLabelMap,
    fieldOrder,
    isLoading,
  };
}
