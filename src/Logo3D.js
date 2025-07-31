import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';

// --- Componente interno que representa o cilindro giratório ---
// Ele recebe a URL da imagem da logo como propriedade (prop)
function SpinningCylinder({ logoUrl }) {
  // Cria uma referência para podermos manipular o objeto 3D diretamente
  const meshRef = useRef();

  // Carrega a imagem da URL. O React vai "esperar" (Suspense) a imagem carregar
  const texture = useLoader(TextureLoader, logoUrl);

  // useFrame é um gancho que executa esta função em cada frame da animação (60x por segundo)
  useFrame((state, delta) => {
    // Gira o cilindro suavemente no eixo Y
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // A velocidade da rotação pode ser ajustada aqui
    }
  });

  // Isto é o que será renderizado na cena 3D
  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      {/* A forma geométrica: um cilindro. Os argumentos são [raioCima, raioBaixo, altura, segmentos] */}
      <cylinderGeometry args={[2, 2, 0.2, 64]} />
      {/* O material do objeto. Usamos a nossa imagem (textura) como o "mapa" de cores */}
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

// --- Componente principal que exportamos e usamos no nosso App ---
// Ele recebe o código do cliente para montar a URL da logo dinamicamente
export default function Logo3D({ clientCode }) {
  // ATENÇÃO: A lógica abaixo assume que as logos no seu bucket do Google Cloud
  // serão nomeadas exatamente com o código do cliente, seguido da extensão .png
  // Exemplo: para o cliente 6883, o arquivo deve se chamar "6883.png"
  // Se o nome do arquivo for diferente (ex: 6883-HAZAK.png), a URL precisa ser ajustada aqui.
  const logoUrl = `https://storage.googleapis.com/logos-portal-mercocamp/${clientCode}.png`;
  
  // Fallback para o caso de a imagem não ser encontrada no bucket
  const fallbackLogoUrl = 'https://placehold.co/300x300/e2e8f0/0d9488?text=Logo';

  const [urlToLoad, setUrlToLoad] = React.useState(logoUrl);

  const handleError = () => {
    setUrlToLoad(fallbackLogoUrl);
  };

  // Adicionamos um key ao componente para forçar a recarga quando a URL muda
  const key = urlToLoad;

  return (
    <div style={{ width: '150px', height: '150px' }}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }}>
        {/* Adiciona uma luz ambiente para iluminar a cena toda suavemente */}
        <ambientLight intensity={1.5} />
        {/* Adiciona uma luz direcional, como um "sol", para dar brilho e sombras */}
        <directionalLight position={[10, 10, 5]} intensity={2} />
        <pointLight position={[-10, -10, -10]} intensity={1} />

        {/* Suspense mostra um fallback (pode ser null) enquanto o conteúdo (a logo) está carregando */}
        <Suspense fallback={null}>
           <SpinningCylinder logoUrl={urlToLoad} key={key} onError={handleError} />
        </Suspense>
      </Canvas>
    </div>
  );
}
