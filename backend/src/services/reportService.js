const AppError = require('../utils/AppError');
const companyRepository = require('../repositories/companyRepository');
const outletRepository = require('../repositories/outletRepository');
const reportRepository = require('../repositories/reportRepository');

async function getRevenueByOutlet(companyId) {
  const company = await companyRepository.getCompanyById(companyId);
  if (!company) throw new AppError('Company not found', 404);
  return reportRepository.revenueByOutlet(companyId);
}

async function getTopSellingItems(outletId, limit = 5) {
  const outlet = await outletRepository.getById(outletId);
  if (!outlet) throw new AppError('Outlet not found', 404);
  return reportRepository.topSellingItems(outletId, limit);
}

module.exports = { getRevenueByOutlet, getTopSellingItems };
