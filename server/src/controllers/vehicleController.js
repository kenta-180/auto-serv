const vehicleRepository = require('../repositories/vehicleRepository');
const { logAudit } = require('../middleware/audit');

const getVehicles = async (req, res) => {
  try {
    let vehicles = [];
    if (req.user.role === 'ADMIN' || req.user.role === 'TECHNICIAN') {
      vehicles = await vehicleRepository.findManyByOwner(null);
    } else {
      // CUSTOMER / STUDENT — Strictly isolate vehicles to current user only
      vehicles = await vehicleRepository.findManyByOwner(req.user.id);
    }

    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

const createVehicle = async (req, res) => {
  try {
    const { licensePlate, make, model, year, vin, ownerId } = req.body;

    if (!licensePlate || !make || !model || !year) {
      return res.status(400).json({ error: 'License plate, make, model, and year are required' });
    }

    const targetOwnerId = (req.user.role === 'ADMIN' && ownerId) ? ownerId : req.user.id;

    const existing = await vehicleRepository.findByLicensePlate(licensePlate);
    if (existing) {
      return res.status(400).json({ error: 'Vehicle with this license plate is already registered' });
    }

    const vehicle = await vehicleRepository.create({
      licensePlate: licensePlate.toUpperCase(),
      make,
      model,
      year: parseInt(year, 10),
      vin: vin || null,
      ownerId: targetOwnerId
    });

    await logAudit({
      userId: req.user.id,
      action: 'VEHICLE_CREATED',
      entity: 'Vehicle',
      entityId: vehicle.id,
      details: `Created vehicle ${vehicle.licensePlate} (${vehicle.make} ${vehicle.model})`
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await vehicleRepository.findById(id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (req.user.role !== 'ADMIN' && vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this vehicle' });
    }

    await vehicleRepository.deleteVehicle(id);

    await logAudit({
      userId: req.user.id,
      action: 'VEHICLE_DELETED',
      entity: 'Vehicle',
      entityId: id,
      details: `Deleted vehicle ${vehicle.licensePlate} (${vehicle.make} ${vehicle.model})`
    });

    res.json({ message: 'Vehicle deleted successfully', id });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};

module.exports = {
  getVehicles,
  createVehicle,
  deleteVehicle
};
