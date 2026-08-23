const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetVehicles() {
  console.log('Clearing all present vehicle and job card data...');

  // Delete in transactional sequence
  await prisma.$transaction([
    prisma.jobMedia.deleteMany({}),
    prisma.jobTask.deleteMany({}),
    prisma.jobPartEstimate.deleteMany({}),
    prisma.jobCardPart.deleteMany({}),
    prisma.qCReport.deleteMany({}),
    prisma.invoice.deleteMany({}),
    prisma.jobCardStatusLog.deleteMany({}),
    prisma.jobCard.deleteMany({}),
    prisma.vehicle.deleteMany({})
  ]);

  console.log('Successfully removed all vehicle records and job cards!');
}

resetVehicles()
  .catch((err) => {
    console.error('Error resetting vehicle data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
