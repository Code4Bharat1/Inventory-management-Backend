// services/stockHistoryService.js
import StockHistory from '../models/stockhistory.model.js';

export const logStockHistory = async ({
  product,
  oldQuantity,
  newQuantity,
  action,
  user = null,
  note = ''
  /**
 * Updates the product quantity in inventory.
 *
 * If 'action' and 'note' are provided in the request body, they are logged in the stock history.
 * Otherwise, defaults are used ('manual update', '').
 *
 * This controller should be used for:
 *  - if user changing then take action and note by user Manually  (by staff/admin)
 *  - System-driven quantity updates (sale, restock, return, etc.) — in those cases, set 'action' and 'note' programmatically
 **/
}) => {
  await StockHistory.create({
    product,
    oldQuantity,
    newQuantity,
    change: newQuantity - oldQuantity,
    action,
    user,
    note
  });
};
