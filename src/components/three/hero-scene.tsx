'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

function MorphingSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  const gradient = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createLinearGradient(0, 0, 512, 512);
    grd.addColorStop(0, '#8b5cf6');
    grd.addColorStop(0.3, '#6366f1');
    grd.addColorStop(0.6, '#a78bfa');
    grd.addColorStop(1, '#818cf8');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={meshRef} scale={2.2}>
        <icosahedronGeometry args={[1, 64]} />
        <MeshDistortMaterial
          map={gradient}
          distort={0.35}
          speed={1.8}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.85}
          color="#8b5cf6"
        />
      </mesh>
    </Float>
  );
}

function InnerGlow() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.1;
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    }
  });

  return (
    <mesh ref={ref} scale={1.2}>
      <torusGeometry args={[1.8, 0.15, 16, 100]} />
      <meshStandardMaterial
        color="#f59e0b"
        emissive="#f59e0b"
        emissiveIntensity={0.5}
        transparent
        opacity={0.25}
        wireframe
      />
    </mesh>
  );
}

export default function HeroScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#e0d5ff" />
        <directionalLight position={[-3, -2, 4]} intensity={0.7} color="#818cf8" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#a78bfa" />
        <MorphingSphere />
        <InnerGlow />
      </Canvas>
    </div>
  );
}
