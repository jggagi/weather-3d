import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Cloud, Sky, Stars, Sparkles } from '@react-three/drei';

function seededRandom(index, seed) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createParticlePositions(count, seed) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    positions[offset] = (seededRandom(offset, seed) - 0.5) * 30;
    positions[offset + 1] = seededRandom(offset + 1, seed) * 20 - 5;
    positions[offset + 2] = (seededRandom(offset + 2, seed) - 0.5) * 15;
  }

  return positions;
}

// ========== Sun ==========
const Sun = () => {
  const sunRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.003;
      sunRef.current.position.y = Math.sin(t * 0.3) * 0.3 + 5;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    }
  });

  return (
    <group ref={sunRef} position={[5, 5, -12]}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshStandardMaterial
          color="#ffdd00"
          emissive="#ffaa00"
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
      {/* Glow ring */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#ffcc44"
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={3} color="#ffdd00" distance={50} />
    </group>
  );
};

// ========== Moon ==========
const Moon = () => {
  const moonRef = useRef();

  useFrame((state) => {
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.001;
      moonRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.2 + 6;
    }
  });

  return (
    <group ref={moonRef} position={[-5, 6, -15]}>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color="#e8e0d0"
          emissive="#aaaacc"
          emissiveIntensity={0.5}
        />
      </mesh>
      <pointLight intensity={0.8} color="#aabbdd" distance={30} />
    </group>
  );
};

// ========== Rain Particles (custom buffer geometry for realistic streaks) ==========
const Rain = () => {
  const rainRef = useRef();
  const count = 2000;

  const positions = useMemo(() => {
    return createParticlePositions(count, 17);
  }, []);

  useFrame(() => {
    if (rainRef.current) {
      const posArray = rainRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] -= 0.4; // Fall speed
        if (posArray[i * 3 + 1] < -5) {
          posArray[i * 3 + 1] = 15;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#88bbff" size={0.06} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

// ========== Snow ==========
const Snow = () => {
  const snowRef = useRef();
  const count = 1500;

  const positions = useMemo(() => {
    return createParticlePositions(count, 31);
  }, []);

  useFrame((state) => {
    if (snowRef.current) {
      const posArray = snowRef.current.geometry.attributes.position.array;
      const t = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        posArray[i * 3] += Math.sin(t + i) * 0.002; // Sway
        posArray[i * 3 + 1] -= 0.03; // Fall speed
        if (posArray[i * 3 + 1] < -5) {
          posArray[i * 3 + 1] = 15;
        }
      }
      snowRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={snowRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.12} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
};

// ========== Scene Controller ==========
const SceneContents = ({ conditionType, isNight }) => {
  const isSunny = conditionType === 'sunny';
  const isCloudy = conditionType === 'cloudy';
  const isRainy = conditionType === 'rain';
  const isSnowy = conditionType === 'snow';

  // Sky parameters based on condition and time
  const skyParams = useMemo(() => {
    if (isNight) {
      return {
        sunPosition: [0, -1, -10],
        rayleigh: 0,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.99,
      };
    }
    if (isRainy) {
      return {
        sunPosition: [0, 1, -10],
        rayleigh: 4,
        mieCoefficient: 0.1,
        mieDirectionalG: 0.7,
      };
    }
    if (isCloudy) {
      return {
        sunPosition: [2, 3, -10],
        rayleigh: 2,
        mieCoefficient: 0.02,
        mieDirectionalG: 0.8,
      };
    }
    // Sunny default
    return {
      sunPosition: [5, 5, -10],
      rayleigh: 0.5,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
    };
  }, [isNight, isRainy, isCloudy]);

  return (
    <>
      <ambientLight intensity={isNight ? 0.1 : isRainy ? 0.3 : 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={isNight ? 0.2 : isRainy ? 0.5 : 1.5} />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={skyParams.sunPosition}
        rayleigh={skyParams.rayleigh}
        mieCoefficient={skyParams.mieCoefficient}
        mieDirectionalG={skyParams.mieDirectionalG}
      />

      {/* Night stars */}
      {isNight && (
        <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={1} />
      )}

      {/* Sun or Moon */}
      {isSunny && !isNight && <Sun />}
      {isNight && <Moon />}

      {/* Clouds — shown for cloudy, rainy, snowy */}
      {(isCloudy || isRainy || isSnowy) && (
        <group position={[0, 6, -10]}>
          <Cloud
            opacity={isRainy ? 0.9 : 0.7}
            speed={0.4}
            width={12}
            depth={1.5}
            segments={20}
            color={isRainy ? '#667788' : isSnowy ? '#aabbcc' : '#ffffff'}
            position={[-4, 1, -5]}
          />
          <Cloud
            opacity={isRainy ? 0.85 : 0.6}
            speed={0.3}
            width={16}
            depth={2}
            segments={20}
            color={isRainy ? '#556677' : isSnowy ? '#99aacc' : '#eeeeff'}
            position={[5, -1, -8]}
          />
          <Cloud
            opacity={0.5}
            speed={0.5}
            width={8}
            depth={1}
            segments={15}
            color={isRainy ? '#778899' : '#ffffff'}
            position={[0, 3, -3]}
          />
        </group>
      )}

      {/* Precipitation */}
      {isRainy && <Rain />}
      {isSnowy && <Snow />}
    </>
  );
};

// ========== Main WeatherScene ==========
const WeatherScene = ({ conditionType, isNight }) => {
  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <React.Suspense fallback={null}>
          <SceneContents conditionType={conditionType} isNight={isNight} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default WeatherScene;
