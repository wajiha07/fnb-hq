const companyRepository = require('../repositories/companyRepository');

async function listCompanies() {
  return companyRepository.listCompanies();
}

module.exports = { listCompanies };
