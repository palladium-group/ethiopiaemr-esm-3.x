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
  'custom:(uuid,name,description,retired,operator,orderSetMembers:(uuid,display,retired,orderTemplate,orderTemplateType,concept:(uuid,display),orderType:(uuid,display)))';
