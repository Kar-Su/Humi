import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Emotion } from "../lib/protocol";

const EMOTION_MAP: Record<Emotion, { preset: string; value: number }[]> = {
  senang: [{ preset: "happy", value: 0.7 }],
  sedih: [{ preset: "sad", value: 0.6 }],
  kaget: [{ preset: "surprised", value: 0.8 }],
  penasaran: [{ preset: "relaxed", value: 0.3 }],
  netral: [],
};

function VrmModel({
  url,
  emotion,
  analyser,
}: {
  url: string;
  emotion: Emotion;
  analyser: AnalyserNode | null;
}) {
  const [vrm, setVrm] = useState<import("@pixiv/three-vrm").VRM | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        const loaded = gltf.userData.vrm as import("@pixiv/three-vrm").VRM;
        VRMUtils.rotateVRM0(loaded);
        loaded.scene.rotation.y = Math.PI;
        setVrm(loaded);
      },
      undefined,
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  useFrame((_, delta) => {
    if (!vrm) return;

    // Emotion blendshape — lerp 200ms
    const targets = EMOTION_MAP[emotion] ?? [];
    const presets = ["happy", "sad", "surprised", "relaxed"] as const;
    for (const p of presets) {
      const target = targets.find((t) => t.preset === p)?.value ?? 0;
      const cur = vrm.expressionManager?.getValue(p) ?? 0;
      const next = THREE.MathUtils.lerp(cur, target, Math.min(1, delta * 5));
      vrm.expressionManager?.setValue(p, next);
    }

    // Lip-sync amplitude from analyser
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      // Low bins (vocal range) average
      const low = data.slice(0, 32);
      const avg = low.reduce((a, b) => a + b, 0) / low.length / 255;
      const amp = Math.min(1, avg * 2.5);
      vrm.expressionManager?.setValue("aa", amp);
      vrm.expressionManager?.setValue("ih", 0);
      vrm.expressionManager?.setValue("ou", 0);
    } else {
      vrm.expressionManager?.setValue("aa", 0);
    }

    vrm.update(delta);
  });

  if (error || !vrm) {
    if (error) return <PlaceholderAvatar />;
    return null;
  }

  // biome-ignore lint/correctness/useUniqueElementIds: VRM primitive
  return <primitive object={vrm.scene} />;
}

function PlaceholderAvatar() {
  return (
    <mesh>
      <capsuleGeometry args={[0.4, 1, 8, 16]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

export function AvatarCanvas({
  emotion,
  analyser,
}: {
  emotion: Emotion;
  analyser: AnalyserNode | null;
}) {
  const [hasVrm] = useState(() => false);
  // ponytail: set hasVrm true + taruh .vrm di public/models/ bila ada model CC0

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 md:h-80">
      <Canvas camera={{ position: [0, 1.2, 2.5], fov: 35 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} />
        {hasVrm ? (
          <VrmModel url="/models/avatar.vrm" emotion={emotion} analyser={analyser} />
        ) : (
          <PlaceholderAvatar />
        )}
        <OrbitControls
          target={[0, 1, 0]}
          enablePan={false}
          minDistance={1}
          maxDistance={4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
