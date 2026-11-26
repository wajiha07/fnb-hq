const AppError = require('../utils/AppError');
const companyRepository = require('../repositories/companyRepository');
const outletRepository = require('../repositories/outletRepository');

async function listOutlets(companyId) {
  const company = await companyRepository.getCompanyById(companyId);
  if (!company) throw new AppError('Company not found', 404);
  return outletRepository.listByCompany(companyId);
}

async function createOutlet(payload) {
  const company = await companyRepository.getCompanyById(payload.companyId);
  if (!company) throw new AppError('Company not found', 404);

  try {
    return await outletRepository.create(payload);
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Outlet code already exists for this company', 409);
    }
    throw err;
  }
}

async function getOutlet(id) {
  const outlet = await outletRepository.getById(id);
  if (!outlet) throw new AppError('Outlet not found', 404);
  return outlet;
}

module.exports = { listOutlets, createOutlet, getOutlet };
