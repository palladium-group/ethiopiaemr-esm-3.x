export const moduleName = '@palladium-ethiopia/esm-orders-admin-app';

export const ordersAdminBasePath = `${window.spaBase}/orders-admin`;

export const ORDER_TEMPLATE_ADMIN_WORKSPACE = 'order-template-admin-workspace';

export const ORDERS_ADMIN_CONTEXT_KEY = 'orders-admin';

export const DRUG_ORDER_TEMPLATE_SCHEMA = 'https://schema.openmrs.org/order/template/drug/simple/v1';

export const orderTemplateListRepresentation =
  'custom:(uuid,name,description,retired,drug:(uuid,display,name,concept:(uuid,display)),concept:(uuid,display))';

export const orderTemplateFullRepresentation =
  'custom:(uuid,name,description,retired,template,drug:(uuid,display,name,concept:(uuid,display)),concept:(uuid,display))';
