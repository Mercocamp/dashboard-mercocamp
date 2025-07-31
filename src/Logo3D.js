import React, { useRef, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, MathUtils } from 'three';

// --- Componente interno que representa o cilindro com a nova animação ---
function AnimatingCylinder({ logoUrl, onAnimationComplete }) {
  const meshRef = useRef();
  const texture = useLoader(TextureLoader, logoUrl);
  
  // Estado para controlar se a animação está ativa
  const [isAnimating, setIsAnimating] = useState(true);

  // Define a rotação inicial (de lado) e a final (de frente)
  const initialRotationY = Math.PI / 2; // 90 graus
  const targetRotationY = 0; // 0 graus

  // Seta a rotação inicial quando o componente é montado
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = initialRotationY;
    }
  }, []);

  useFrame((state, delta) => {
    if (isAnimating && meshRef.current) {
      // Interpola suavemente da rotação atual para a rotação final
      meshRef.current.rotation.y = MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, 0.05);

      // Verifica se a animação está perto o suficiente do final para parar
      if (Math.abs(meshRef.current.rotation.y - targetRotationY) < 0.01) {
        meshRef.current.rotation.y = targetRotationY; // Trava na posição final
        setIsAnimating(false); // Para a animação
        if (onAnimationComplete) onAnimationComplete();
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[2, 2, 0.2, 64]} />
      <meshStandardMaterial map={texture} transparent />
    </mesh>
  );
}

// --- Componente principal que exportamos ---
export default function Logo3D({ clientCode, clientName }) {
  // Pega a primeira palavra do nome do cliente e converte para MAIÚSCULAS.
  const simplifiedName = clientName ? clientName.split(' ')[0].toUpperCase() : '';
  // Monta o nome do arquivo no padrão "CODIGO-NOME"
  const fileName = `${clientCode}-${simplifiedName}`;
  
  // Monta a URL final. Note que NÃO adicionamos .png aqui, pois o nome do objeto no bucket não tem a extensão.
  const logoUrl = `https://storage.googleapis.com/logos-portal-mercocamp/${fileName}`;
  
  // Imagem de fallback caso a logo do cliente não seja encontrada
  const fallbackLogoUrl = 'https://placehold.co/300x300/e2e8f0/0d9488?text=Logo';
  const [urlToLoad, setUrlToLoad] = useState(logoUrl);

  // Verifica se a imagem existe, se não, usa a de fallback
  useEffect(() => {
      const img = new Image();
      img.src = logoUrl;
      img.onload = () => {
          setUrlToLoad(logoUrl);
      };
      img.onerror = () => {
          setUrlToLoad(fallbackLogoUrl);
      };
  }, [logoUrl]);


  return (
    <div style={{ width: '100px', height: '100px', cursor: 'pointer' }}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }}>
        <ambientLight intensity={2.5} />
        <directionalLight position={[10, 10, 5]} intensity={3} />
        <Suspense fallback={null}>
          {/* Usamos a key para forçar o componente a recarregar e reanimar quando o cliente muda */}
          <AnimatingCylinder logoUrl={urlToLoad} key={clientCode} />
        </Suspense>
      </Canvas>
    </div>
  );
}
