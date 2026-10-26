export const moduleName = '@palladium-ethiopia/esm-orders-admin-app';

export const ordersAdminBasePath = `${window.spaBase}/orders-admin`;

export const ORDER_TEMPLATE_ADMIN_WORKSPACE = 'order-template-admin-workspace';

export const ORDER_SET_ADMIN_WORKSPACE = 'order-set-admin-workspace';

export const ORDERS_ADMIN_CONTEXT_KEY = 'orders-admin';

export type OrderSetOperator = 'ALL' | 'ONE' | 'ANY';

export const orderSetOperators: Array<OrderSetOperator> = ['ALL', 'ONE', 'ANY'];

export const DRUG_ORDER_TEMPLATE_SCHEMA = 'https://schema.openmrs.org/order/template/drug/simple/v1';

export const orderTemplateListRepresentation =
  'custom:(uuid,name,description,retired,drug:(uuid,display,name,concept:(uuid,display)),concept:(uuid,display))';

export const orderTemplateFullRepresentation =
  'custom:(uuid,name,description,retired,template,drug:(uuid,display,name,concept:(uuid,display)),concept:(uuid,display))';

export const orderSetListRepresentation =
  'custom:(uuid,name,description,retired,operator,orderSetMembers:(uuid,display,retired,concept:(uuid,display),orderType:(uuid,display)))';

export const orderSetFullRepresentation =
  'custom:(uuid,name,description,retired,operator,attributes:(uuid,value,attributeType:(uuid)),orderSetMembers:(uuid,display,retired,orderTemplate,orderTemplateType,concept:(uuid,display),orderType:(uuid,display)))';

/** Order set attribute type holding instructions for the whole set; created by the ethiopiaemr-custom-module backend. */
export const ORDER_SET_INSTRUCTIONS_ATTRIBUTE_TYPE_UUID = 'd239f453-478c-4a2f-b02b-10848d7c61f5';

/** Core rejects order set descriptions longer than this, regardless of the database column size. */
export const ORDER_SET_DESCRIPTION_MAX_LENGTH = 255;
