export enum Permissions {
  // EthiopiaEMR permissions

  // Clock In-Out permissions
  ClockInOut = 'ethioemr: Billing: Clock In-Out',

  // Payment permissions
  ProcessPayment = 'ethioemr: Billing: Process Payment',
  DiscardPayment = 'ethioemr: Billing: Discard Payment',

  // Invoice permissions
  PrintInvoice = 'ethioemr: Billing: Print Invoice',
  PrintReceipt = 'ethioemr: Billing: Print Receipt',
  PrintBillStatement = 'ethioemr: Billing: Print Bill Statement',

  // Deposit permissions
  ViewDeposit = 'ethioemr: Billing: View Deposit',
  AddDeposit = 'ethioemr: Billing: Add Deposit',
  ApplyDeposit = 'ethioemr: Billing: Apply Deposit',

  // Payment History permissions
  ViewPaymentHistory = 'ethioemr: Billing: View Payment History',

  // Payment Point permissions
  ViewPaymentPoint = 'ethioemr: Billing: View Payment Point',
  SwitchPaymentPoint = 'ethioemr: Billing: Switch Payment Point',
  CreatePaymentPoint = 'ethioemr: Billing: Create Payment Point',
  EditPaymentPoint = 'ethioemr: Billing: Edit Payment Point',
  DeletePaymentPoint = 'ethioemr: Billing: Delete Payment Point',

  // Payment Mode permissions
  ViewPaymentMode = 'ethioemr: Billing: View Payment Mode',
  AddPaymentMode = 'ethioemr: Billing: Add Payment Mode',
  EditPaymentMode = 'ethioemr: Billing: Edit Payment Mode',
  DeletePaymentMode = 'ethioemr: Billing: Delete Payment Mode',

  // Bill Manager permissions
  ViewBillManager = 'ethioemr: Billing: View Bill Manager',
  WaiveBill = 'ethioemr: Billing: Waive Bill',
  EditBillItem = 'ethioemr: Billing: Edit Bill Item',
  CancelBillItem = 'ethioemr: Billing: Cancel Bill Item',
  DeleteBill = 'ethioemr: Billing: Delete Bill',

  // Charge Item permissions
  ViewChargeItems = 'ethioemr: Billing: View Charge Items',

  // Charge Service permissions
  AddChargeService = 'ethioemr: Billing: Add Charge Service',
  EditChargeService = 'ethioemr: Billing: Edit Charge Service',
  DeleteChargeService = 'ethioemr: Billing: Delete Charge Service',
  // For now, use the same permission chart item and charge service
  AddChargeItem = 'ethioemr: Billing: Add Charge Service',
  EditChargeItem = 'ethioemr: Billing: Edit Charge Service',
  DeleteChargeItem = 'ethioemr: Billing: Delete Charge Service',

  // Exemptions Schema permissions
  ViewExemptionsSchema = 'ethioemr: Billing: View Exemptions Schema',
  AddExcemptionsSchema = 'ethioemr: Billing: Add Excemptions Schema',

  // Legacy permissions
  ViewBillingAdminDashboard = 'o3: View Billing Admin Dashboard',
  ViewBillingMetrics = 'o3: View Billing Metrics',
  ReOpenCashierBills = 'Reopen Cashier Bills',
  CloseCashierBills = 'Close Cashier Bills',
}
