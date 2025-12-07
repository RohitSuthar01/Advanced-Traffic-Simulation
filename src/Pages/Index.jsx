import React, { useState, useEffect, useRef } from 'react';
import { Car, Ambulance, Pause, Play, RotateCcw, AlertCircle } from 'lucide-react';

const TrafficSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('STOPPED');
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState('smart');
  const [weather, setWeather] = useState('clear');
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    nsTraffic: 0,
    ewTraffic: 0,
    totalVehicles: 0,
    vehiclesPassed: 0,
    avgWaitTime: 0,
    avgSpeed: 0,
    queueLength: 0,
    efficiency: 0
  });
  const [settings, setSettings] = useState({
    greenTime: 15,
    yellowTime: 3,
    vehicleFreq: 5
  });
  const [emergencyMode, setEmergencyMode] = useState(false);

  const nextIdRef = useRef(0);
  const phaseTimerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const animationRef = useRef(null);

  const directions = ['north', 'south', 'east', 'west'];

  // Traffic light states: NS = North-South, EW = East-West
  const [lightStates, setLightStates] = useState({
    ns: 'red',
    ew: 'red'
  });

  // Sensor data for AI decision making
  const getSensorData = () => {
    const nsCount = vehicles.filter(v =>
      (v.direction === 'north' || v.direction === 'south') && !v.passed
    ).length;
    const ewCount = vehicles.filter(v =>
      (v.direction === 'east' || v.direction === 'west') && !v.passed
    ).length;

    return { nsCount, ewCount };
  };

  // AI-powered traffic light control
  const aiDecidePhase = () => {
    const { nsCount, ewCount } = getSensorData();
    const hasEmergency = vehicles.some(v => v.isEmergency && !v.passed);

    if (hasEmergency) {
      const emergencyVehicle = vehicles.find(v => v.isEmergency && !v.passed);
      if (emergencyVehicle) {
        return ['north', 'south'].includes(emergencyVehicle.direction) ? 'NS_GREEN' : 'EW_GREEN';
      }
    }

    if (mode === 'smart') {
      // AI logic: Give green to direction with more traffic
      if (nsCount > ewCount + 2) return 'NS_GREEN';
      if (ewCount > nsCount + 2) return 'EW_GREEN';
    }

    // Default alternating pattern
    return currentPhase === 'NS_GREEN' || currentPhase === 'NS_YELLOW' ? 'EW_GREEN' : 'NS_GREEN';
  };

  // Vehicle spawning
  const spawnVehicle = () => {
    if (!isRunning || vehicles.length > 50) return;

    const direction = directions[Math.floor(Math.random() * directions.length)];
    const isEmergency = emergencyMode || Math.random() < 0.05; // 5% chance of ambulance

    const startPositions = {
      north: { x: 48, y: -10 },
      south: { x: 52, y: 110 },
      east: { x: 110, y: 48 },
      west: { x: -10, y: 52 }
    };

    const newVehicle = {
      id: nextIdRef.current++,
      direction,
      isEmergency,
      ...startPositions[direction],
      speed: isEmergency ? 3 : 1.5,
      waitTime: 0,
      passed: false,
      stopped: false
    };

    setVehicles(prev => [...prev, newVehicle]);
  };

  // Check if vehicle should stop at red light
const shouldStop = (vehicle) => {
  // 🚨 Emergency vehicles NEVER stop
  if (vehicle.isEmergency) return false;

  const { direction, x, y } = vehicle;
  const nsGreen = lightStates.ns === 'green';
  const ewGreen = lightStates.ew === 'green';

  const stopPositions = {
    north: y >= 35 && y <= 40,
    south: y >= 60 && y <= 65,
    east: x >= 60 && x <= 65,
    west: x >= 35 && x <= 40
  };

  if (direction === 'north' || direction === 'south') {
    return !nsGreen && stopPositions[direction];
  } else {
    return !ewGreen && stopPositions[direction];
  }
};


  // Update vehicle positions
  const updateVehicles = () => {
    setVehicles(prev => {
      const updated = prev.map(vehicle => {
        if (vehicle.passed) return vehicle;

        const shouldStopNow = shouldStop(vehicle);
        let newX = vehicle.x;
        let newY = vehicle.y;
        let newWaitTime = vehicle.waitTime;

        if (shouldStopNow) {
          newWaitTime += 0.1;
          return { ...vehicle, stopped: true, waitTime: newWaitTime };
        }

        // Move vehicle
        const speed = vehicle.isEmergency ? 2.5 : 1.2;
        switch (vehicle.direction) {
          case 'north':
            newY = vehicle.y + speed;
            break;
          case 'south':
            newY = vehicle.y - speed;
            break;
          case 'east':
            newX = vehicle.x - speed;
            break;
          case 'west':
            newX = vehicle.x + speed;
            break;
        }

        // Check if passed intersection
        const hasPassed =
          (vehicle.direction === 'north' && newY > 110) ||
          (vehicle.direction === 'south' && newY < -10) ||
          (vehicle.direction === 'east' && newX < -10) ||
          (vehicle.direction === 'west' && newX > 110);

        if (hasPassed) {
          setStats(s => ({ ...s, vehiclesPassed: s.vehiclesPassed + 1 }));
          return { ...vehicle, passed: true };
        }

        return { ...vehicle, x: newX, y: newY, stopped: false, waitTime: newWaitTime };
      });

      // Remove passed vehicles
      return updated.filter(v => !v.passed);
    });
  };

  // Traffic light phase management
  useEffect(() => {
    if (!isRunning) return;

    phaseTimerRef.current = setInterval(() => {
      setTimer(prev => {
        const newTimer = prev + 1;

        if (currentPhase === 'NS_GREEN' && newTimer >= settings.greenTime) {
          setCurrentPhase('NS_YELLOW');
          setLightStates({ ns: 'yellow', ew: 'red' });
          return 0;
        } else if (currentPhase === 'NS_YELLOW' && newTimer >= settings.yellowTime) {
          const nextPhase = aiDecidePhase();
          setCurrentPhase(nextPhase);
          setLightStates(nextPhase === 'NS_GREEN' ?
            { ns: 'green', ew: 'red' } :
            { ns: 'red', ew: 'green' }
          );
          return 0;
        } else if (currentPhase === 'EW_GREEN' && newTimer >= settings.greenTime) {
          setCurrentPhase('EW_YELLOW');
          setLightStates({ ns: 'red', ew: 'yellow' });
          return 0;
        } else if (currentPhase === 'EW_YELLOW' && newTimer >= settings.yellowTime) {
          const nextPhase = aiDecidePhase();
          setCurrentPhase(nextPhase);
          setLightStates(nextPhase === 'NS_GREEN' ?
            { ns: 'green', ew: 'red' } :
            { ns: 'red', ew: 'green' }
          );
          return 0;
        }

        return newTimer;
      });
    }, 1000);

    return () => clearInterval(phaseTimerRef.current);
  }, [isRunning, currentPhase, settings]);

  // Vehicle spawning interval
  useEffect(() => {
    if (!isRunning) return;

    const spawnInterval = Math.max(500, 3000 - settings.vehicleFreq * 200);
    spawnTimerRef.current = setInterval(spawnVehicle, spawnInterval);

    return () => clearInterval(spawnTimerRef.current);
  }, [isRunning, settings.vehicleFreq, emergencyMode]);

  // Animation loop for smooth vehicle movement
  useEffect(() => {
    if (!isRunning) return;

    const animate = () => {
      updateVehicles();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, lightStates]);

  // Update statistics
  useEffect(() => {
    const { nsCount, ewCount } = getSensorData();
    const totalWaitTime = vehicles.reduce((sum, v) => sum + v.waitTime, 0);
    const avgWait = vehicles.length > 0 ? (totalWaitTime / vehicles.length).toFixed(1) : 0;
    const queueLen = vehicles.filter(v => v.stopped).length;
    const efficiency = stats.vehiclesPassed > 0
      ? Math.min(100, Math.round((stats.vehiclesPassed / (stats.vehiclesPassed + vehicles.length)) * 100))
      : 0;

    setStats(s => ({
      ...s,
      nsTraffic: nsCount,
      ewTraffic: ewCount,
      totalVehicles: vehicles.length,
      avgWaitTime: avgWait,
      queueLength: queueLen,
      avgSpeed: isRunning ? 35 : 0,
      efficiency
    }));
  }, [vehicles, stats.vehiclesPassed]);

  // Control functions
  const handleStart = () => {
    setIsRunning(true);
    if (currentPhase === 'STOPPED') {
      setCurrentPhase('NS_GREEN');
      setLightStates({ ns: 'green', ew: 'red' });
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('STOPPED');
    setTimer(0);
    setVehicles([]);
    setLightStates({ ns: 'red', ew: 'red' });
    setStats({
      nsTraffic: 0,
      ewTraffic: 0,
      totalVehicles: 0,
      vehiclesPassed: 0,
      avgWaitTime: 0,
      avgSpeed: 0,
      queueLength: 0,
      efficiency: 0
    });
    setEmergencyMode(false);
    nextIdRef.current = 0;
  };

  const handleEmergency = () => {
    setEmergencyMode(!emergencyMode);
    if (!emergencyMode) {
      spawnVehicle();
    }
  };

  const weatherEffects = {
    clear: 'bg-blue-100',
    rain: 'bg-gray-300',
    night: 'bg-gray-800',
    fog: 'bg-gray-400'
  };

  return (
    <div className={`min-h-screen ${weatherEffects[weather]} transition-colors duration-1000 p-4`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg mb-6">
          <h1 className="text-3xl font-bold mb-2">🚦 AI-Powered Traffic Simulation System</h1>
          <p className="text-blue-100">Advanced Real-time Traffic Management with Intelligent Controls</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Intersection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden">
                {/* Roads */}
                <div className="absolute inset-0">
                  {/* Vertical road */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-1/5 bg-gray-700 transform -translate-x-1/2">
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-yellow-400 transform -translate-x-1/2"
                      style={{ backgroundImage: 'repeating-linear-gradient(0deg, yellow 0px, yellow 20px, transparent 20px, transparent 40px)' }} />
                  </div>
                  {/* Horizontal road */}
                  <div className="absolute top-1/2 left-0 right-0 h-1/5 bg-gray-700 transform -translate-y-1/2">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-yellow-400 transform -translate-y-1/2"
                      style={{ backgroundImage: 'repeating-linear-gradient(90deg, yellow 0px, yellow 20px, transparent 20px, transparent 40px)' }} />
                  </div>
                  {/* Intersection */}
                  <div className="absolute top-1/2 left-1/2 w-1/5 h-1/5 bg-gray-700 transform -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Traffic Lights */}
                <div className="absolute top-[38%] left-[38%] bg-gray-900 p-2 rounded-lg">
                  <div className={`w-4 h-4 rounded-full mb-1 ${lightStates.ns === 'red' ? 'bg-red-600' : 'bg-red-900'}`} />
                  <div className={`w-4 h-4 rounded-full mb-1 ${lightStates.ns === 'yellow' ? 'bg-yellow-400' : 'bg-yellow-900'}`} />
                  <div className={`w-4 h-4 rounded-full ${lightStates.ns === 'green' ? 'bg-green-500' : 'bg-green-900'}`} />
                  <div className="text-white text-xs text-center mt-1">NS</div>
                </div>

                <div className="absolute top-[38%] right-[38%] bg-gray-900 p-2 rounded-lg">
                  <div className={`w-4 h-4 rounded-full mb-1 ${lightStates.ew === 'red' ? 'bg-red-600' : 'bg-red-900'}`} />
                  <div className={`w-4 h-4 rounded-full mb-1 ${lightStates.ew === 'yellow' ? 'bg-yellow-400' : 'bg-yellow-900'}`} />
                  <div className={`w-4 h-4 rounded-full ${lightStates.ew === 'green' ? 'bg-green-500' : 'bg-green-900'}`} />
                  <div className="text-white text-xs text-center mt-1">EW</div>
                </div>

                {/* Sensors */}
                {['N', 'S', 'E', 'W'].map((dir, idx) => {
                  const positions = [
                    'top-[20%] left-1/2 -translate-x-1/2',
                    'bottom-[20%] left-1/2 -translate-x-1/2',
                    'top-1/2 right-[20%] -translate-y-1/2',
                    'top-1/2 left-[20%] -translate-y-1/2'
                  ];
                  const hasVehicles = (dir === 'N' && stats.nsTraffic > 0) ||
                    (dir === 'S' && stats.nsTraffic > 0) ||
                    (dir === 'E' && stats.ewTraffic > 0) ||
                    (dir === 'W' && stats.ewTraffic > 0);
                  return (
                    <div key={dir} className={`absolute ${positions[idx]} bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold ${hasVehicles ? 'animate-pulse' : ''}`}>
                      {dir}
                    </div>
                  );
                })}

                {/* Vehicles */}
                {vehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="absolute"
                    style={{
                      left: `${vehicle.x}%`,
                      top: `${vehicle.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {vehicle.isEmergency ? (
                      <Ambulance
                        className={`${vehicle.stopped ? 'text-red-700' : 'text-red-500'}`}
                        size={60}
                      />
                    ) : (
                      <Car
                        className={`${vehicle.stopped ? 'text-blue-900' : 'text-blue-500'}`}
                        size={45}
                      />
                    )}
                  </div>
                ))}

              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Main Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">🎮 Control Panel</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleStart} disabled={isRunning} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition">
                  <Play size={20} /> Start
                </button>
                <button onClick={handlePause} disabled={!isRunning} className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition">
                  <Pause size={20} /> Pause
                </button>
                <button onClick={handleReset} className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition">
                  <RotateCcw size={20} /> Reset
                </button>
                <button onClick={handleEmergency} className={`flex items-center justify-center gap-2 ${emergencyMode ? 'bg-red-700' : 'bg-red-600'} hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition`}>
                  <Ambulance size={20} /> {emergencyMode ? 'Active' : 'Emergency'}
                </button>
              </div>

              {/* Mode Selection */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3">🎚️ Traffic Mode</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['normal', 'rush', 'smart', 'manual'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`py-2 px-3 rounded-lg font-semibold transition ${mode === m ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">⚙️ Timing Settings</h4>
                <div>
                  <label className="text-sm text-gray-600">Green Duration: {settings.greenTime}s</label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={settings.greenTime}
                    onChange={(e) => setSettings({ ...settings, greenTime: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Yellow Duration: {settings.yellowTime}s</label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={settings.yellowTime}
                    onChange={(e) => setSettings({ ...settings, yellowTime: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Spawn Rate: {settings.vehicleFreq}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.vehicleFreq}
                    onChange={(e) => setSettings({ ...settings, vehicleFreq: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">📊 System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Phase:</span>
                  <span className="font-bold text-blue-600">{currentPhase}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Timer:</span>
                  <span className="font-bold">{timer}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">N-S Traffic:</span>
                  <span className="font-bold text-green-600">{stats.nsTraffic}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">E-W Traffic:</span>
                  <span className="font-bold text-green-600">{stats.ewTraffic}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Vehicles:</span>
                  <span className="font-bold">{stats.totalVehicles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Wait Time:</span>
                  <span className="font-bold">{stats.avgWaitTime}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Panel */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">🌤️ Weather Conditions</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: 'clear', icon: '☀️', label: 'Clear' },
              { name: 'rain', icon: '🌧️', label: 'Rain' },
              { name: 'night', icon: '🌙', label: 'Night' },
              { name: 'fog', icon: '🌫️', label: 'Fog' }
            ].map(w => (
              <button
                key={w.name}
                onClick={() => setWeather(w.name)}
                className={`py-3 px-4 rounded-lg font-semibold transition ${weather === w.name ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
              >
                {w.icon} {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
            <h4 className="text-sm opacity-90 mb-2">🚗 Vehicles Passed</h4>
            <div className="text-3xl font-bold">{stats.vehiclesPassed}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
            <h4 className="text-sm opacity-90 mb-2">⚡ Average Speed</h4>
            <div className="text-3xl font-bold">{stats.avgSpeed} km/h</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-6">
            <h4 className="text-sm opacity-90 mb-2">⏱️ Queue Length</h4>
            <div className="text-3xl font-bold">{stats.queueLength}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
            <h4 className="text-sm opacity-90 mb-2">✨ Efficiency</h4>
            <div className="text-3xl font-bold">{stats.efficiency}%</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 bg-gray-800 text-white text-center py-4 rounded-lg">
          <p>© 2024 AI-Powered Traffic Simulation System - Intelligent Real-time Traffic Management</p>
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulation;