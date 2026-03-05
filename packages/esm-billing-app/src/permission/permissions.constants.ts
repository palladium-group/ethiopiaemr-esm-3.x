export enum Permissions {
  // EthiopiaEMR permissions

  // Clock In-Out permissions
  ClockInOut = 'ethiopiaemr: Billing: Clock In-Out',

  // Payment permissions
  ProcessPayment = 'ethiopiaemr: Billing: Process Payment',
  DiscardPayment = 'ethiopiaemr: Billing: Discard Payment',

  // Invoice permissions
  PrintInvoice = 'ethiopiaemr: Billing: Print Invoice',
  PrintReceipt = 'ethiopiaemr: Billing: Print Receipt',
  PrintBillStatement = 'ethiopiaemr: Billing: Print Bill Statement',

  // Deposit permissions
  ViewDeposit = 'ethiopiaemr: Billing: View Deposit',
  AddDeposit = 'ethiopiaemr: Billing: Add Deposit',
  ApplyDeposit = 'ethiopiaemr: Billing: Apply Deposit',

  // Payment History permissions
  ViewPaymentHistory = 'ethiopiaemr: Billing: View Payment History',

  // Payment Point permissions
  ViewPaymentPoint = 'ethiopiaemr: Billing: View Payment Point',
  SwitchPaymentPoint = 'ethiopiaemr: Billing: Switch Payment Point',
  CreatePaymentPoint = 'ethiopiaemr: Billing: Create Payment Point',
  EditPaymentPoint = 'ethiopiaemr: Billing: Edit Payment Point',
  DeletePaymentPoint = 'ethiopiaemr: Billing: Delete Payment Point',

  // Payment Mode permissions
  ViewPaymentMode = 'ethiopiaemr: Billing: View Payment Mode',
  AddPaymentMode = 'ethiopiaemr: Billing: Add Payment Mode',
  EditPaymentMode = 'ethiopiaemr: Billing: Edit Payment Mode',
  DeletePaymentMode = 'ethiopiaemr: Billing: Delete Payment Mode',

  // Bill Manager permissions
  ViewBillManager = 'ethiopiaemr: Billing: View Bill Manager',
  WaiveBill = 'ethiopiaemr: Billing: Waive Bill',
  EditBillItem = 'ethiopiaemr: Billing: Edit Bill Item',
  CancelBillItem = 'ethiopiaemr: Billing: Cancel Bill Item',
  DeleteBill = 'ethiopiaemr: Billing: Delete Bill',

  // Charge Item permissions
  ViewChargeItems = 'ethiopiaemr: Billing: View Charge Items',

  // Charge Service permissions
  AddChargeService = 'ethiopiaemr: Billing: Add Charge Service',
  EditChargeService = 'ethiopiaemr: Billing: Edit Charge Service',
  DeleteChargeService = 'ethiopiaemr: Billing: Delete Charge Service',
  // For now, use the same permission chart item and charge service
  AddChargeItem = 'ethiopiaemr: Billing: Add Charge Service',
  EditChargeItem = 'ethiopiaemr: Billing: Edit Charge Service',
  DeleteChargeItem = 'ethiopiaemr: Billing: Delete Charge Service',

  // Exemptions Schema permissions
  ViewExemptionsSchema = 'ethiopiaemr: Billing: View Exemptions Schema',
  AddExcemptionsSchema = 'ethiopiaemr: Billing: Add Excemptions Schema',

  // Legacy permissions
  ViewBillingAdminDashboard = 'o3: View Billing Admin Dashboard',
  ViewBillingMetrics = 'o3: View Billing Metrics',
  ReOpenCashierBills = 'Reopen Cashier Bills',
  CloseCashierBills = 'Close Cashier Bills',
}
