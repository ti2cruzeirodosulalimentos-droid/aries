import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import mannequinAsset from "@/assets/3d/mannequin.glb.asset.json";

export type MuscleGroup =
  | "peito" | "costas" | "ombros" | "biceps" | "triceps" | "antebraco"
  | "abdomen" | "lombar" | "gluteo" | "quadriceps" | "posterior" | "panturrilha"
  | "trapezio";

export type PosturalRegion =
  | "cabeca" | "ombro_d" | "ombro_e" | "coluna" | "quadril"
  | "joelho_d" | "joelho_e" | "pe_d" | "pe_e";

interface Props {
  highlight?: MuscleGroup[];
  heatmap?: Partial<Record<MuscleGroup, "up" | "down" | "same">>;
  gender?: "masculino" | "feminino";
  view?: "frente" | "costas" | "lado";
  onRegionClick?: (region: PosturalRegion) => void;
  activeRegions?: PosturalRegion[];
  height?: number;
}

useGLTF.preload(mannequinAsset.url);

const MUSCLE_BONES: Record<MuscleGroup, string[]> = {
  peito:      ["mixamorigSpine2"],
  costas:     ["mixamorigSpine1"],
  ombros:     ["mixamorigLeftShoulder", "mixamorigRightShoulder"],
  biceps:     ["mixamorigLeftArm", "mixamorigRightArm"],
  triceps:    ["mixamorigLeftArm", "mixamorigRightArm"],
  antebraco:  ["mixamorigLeftForeArm", "mixamorigRightForeArm"],
  abdomen:    ["mixamorigSpine"],
  lombar:     ["mixamorigSpine"],
  gluteo:     ["mixamorigHips"],
  quadriceps: ["mixamorigLeftUpLeg", "mixamorigRightUpLeg"],
  posterior:  ["mixamorigLeftUpLeg", "mixamorigRightUpLeg"],
  panturrilha:["mixamorigLeftLeg", "mixamorigRightLeg"],
  trapezio:   ["mixamorigNeck"],
};

const POSTURAL_BONES: Record<PosturalRegion, string[]> = {
  cabeca:   ["mixamorigHead", "mixamorigHeadTop_End"],
  ombro_d:  ["mixamorigRightShoulder", "mixamorigRightArm"],
  ombro_e:  ["mixamorigLeftShoulder", "mixamorigLeftArm"],
  coluna:   ["mixamorigSpine", "mixamorigSpine1", "mixamorigSpine2"],
  quadril:  ["mixamorigHips"],
  joelho_d: ["mixamorigRightLeg"],
  joelho_e: ["mixamorigLeftLeg"],
  pe_d:     ["mixamorigRightFoot", "mixamorigRightToeBase"],
  pe_e:     ["mixamorigLeftFoot", "mixamorigLeftToeBase"],
};

// Cores
const SKIN_M = new THREE.Color("#c99878");
const SKIN_F = new THREE.Color("#e8c4a8");
const COLOR_LESION = new THREE.Color("#f97316"); // laranja
const COLOR_HIGHLIGHT = new THREE.Color("#3B82F6");
const COLOR_UP = new THREE.Color("#ef4444");
const COLOR_DOWN = new THREE.Color("#22c55e");
const COLOR_SAME = new THREE.Color("#9ca3af");

function muscleColor(
  m: MuscleGroup,
  highlight: MuscleGroup[],
  heatmap?: Partial<Record<MuscleGroup, "up" | "down" | "same">>,
): THREE.Color | null {
  if (heatmap?.[m] === "down") return COLOR_DOWN;
  if (heatmap?.[m] === "up") return COLOR_UP;
  if (heatmap?.[m] === "same") return COLOR_SAME;
  if (highlight.includes(m)) return COLOR_HIGHLIGHT;
  return null;
}

function Mannequin({ highlight = [], heatmap, gender = "masculino", onRegionClick, activeRegions = [] }: Props) {
  const { scene } = useGLTF(mannequinAsset.url) as unknown as { scene: THREE.Group };
  const root = useRef<THREE.Group>(null);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
          const cloneMat = mat.clone();
          cloneMat.color = new THREE.Color(0xffffff); // base branca, cor real vem do vertexColor
          cloneMat.vertexColors = true;
          cloneMat.roughness = 0.6;
          cloneMat.metalness = 0.05;
          mesh.material = cloneMat;
        }
      }
    });
    return c;
  }, [scene]);

  // Coletar skinned meshes
  const skinnedMeshes = useMemo(() => {
    const list: THREE.SkinnedMesh[] = [];
    cloned.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if ((sm as any).isSkinnedMesh) list.push(sm);
    });
    return list;
  }, [cloned]);

  // Garante atributo color e inicializa
  useEffect(() => {
    const skin = gender === "feminino" ? SKIN_F : SKIN_M;
    skinnedMeshes.forEach((sm) => {
      const geom = sm.geometry as THREE.BufferGeometry;
      const count = geom.attributes.position.count;
      if (!geom.attributes.color) {
        const arr = new Float32Array(count * 3);
        geom.setAttribute("color", new THREE.BufferAttribute(arr, 3));
      }
      const colAttr = geom.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) colAttr.setXYZ(i, skin.r, skin.g, skin.b);
      colAttr.needsUpdate = true;
    });
  }, [skinnedMeshes, gender]);

  // Aplicar pintura por região (lesão postural -> laranja) e músculos
  useEffect(() => {
    const skin = gender === "feminino" ? SKIN_F : SKIN_M;

    // Mapear bones por nome
    const bonesByName = new Map<string, number>(); // name -> skeleton bone index
    if (skinnedMeshes[0]?.skeleton) {
      skinnedMeshes[0].skeleton.bones.forEach((b, i) => bonesByName.set(b.name, i));
    }

    // Conjuntos de bone-indices por região ativa
    const regionBoneIdx = new Set<number>();
    activeRegions.forEach((r) => {
      POSTURAL_BONES[r].forEach((n) => {
        const idx = bonesByName.get(n);
        if (idx !== undefined) regionBoneIdx.add(idx);
      });
    });

    // Músculos pintados
    type MusclePaint = { idx: Set<number>; color: THREE.Color };
    const musclePaints: MusclePaint[] = [];
    (Object.keys(MUSCLE_BONES) as MuscleGroup[]).forEach((m) => {
      const col = muscleColor(m, highlight, heatmap);
      if (!col) return;
      const set = new Set<number>();
      MUSCLE_BONES[m].forEach((n) => {
        const i = bonesByName.get(n);
        if (i !== undefined) set.add(i);
      });
      if (set.size) musclePaints.push({ idx: set, color: col });
    });

    skinnedMeshes.forEach((sm) => {
      const geom = sm.geometry as THREE.BufferGeometry;
      const colAttr = geom.attributes.color as THREE.BufferAttribute;
      const skinIndex = geom.attributes.skinIndex as THREE.BufferAttribute;
      const skinWeight = geom.attributes.skinWeight as THREE.BufferAttribute;
      const count = geom.attributes.position.count;
      if (!skinIndex || !skinWeight) return;

      for (let v = 0; v < count; v++) {
        // base
        let r = skin.r, g = skin.g, b = skin.b;

        // calcula peso para região postural e cada músculo
        let regionW = 0;
        const muscleW = musclePaints.map(() => 0);

        for (let k = 0; k < 4; k++) {
          const bi = skinIndex.getComponent(v, k) as number;
          const w = skinWeight.getComponent(v, k) as number;
          if (w <= 0) continue;
          if (regionBoneIdx.has(bi)) regionW += w;
          musclePaints.forEach((mp, mi) => { if (mp.idx.has(bi)) muscleW[mi] += w; });
        }

        // aplica músculos primeiro
        musclePaints.forEach((mp, mi) => {
          if (muscleW[mi] > 0.4) {
            const t = Math.min(1, muscleW[mi]);
            r = THREE.MathUtils.lerp(r, mp.color.r, t * 0.85);
            g = THREE.MathUtils.lerp(g, mp.color.g, t * 0.85);
            b = THREE.MathUtils.lerp(b, mp.color.b, t * 0.85);
          }
        });

        // lesão postural sobrepõe (laranja)
        if (regionW > 0.4) {
          const t = Math.min(1, regionW);
          r = THREE.MathUtils.lerp(r, COLOR_LESION.r, t);
          g = THREE.MathUtils.lerp(g, COLOR_LESION.g, t);
          b = THREE.MathUtils.lerp(b, COLOR_LESION.b, t);
        }

        colAttr.setXYZ(v, r, g, b);
      }
      colAttr.needsUpdate = true;
    });
  }, [skinnedMeshes, activeRegions, highlight, heatmap, gender]);

  // Click no corpo → identifica região postural pela bone dominante do vértice mais próximo
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onRegionClick) return;
    e.stopPropagation();
    const intersect = e.intersections[0];
    if (!intersect || !intersect.face) return;
    const sm = intersect.object as THREE.SkinnedMesh;
    if (!(sm as any).isSkinnedMesh) return;
    const geom = sm.geometry as THREE.BufferGeometry;
    const skinIndex = geom.attributes.skinIndex as THREE.BufferAttribute;
    const skinWeight = geom.attributes.skinWeight as THREE.BufferAttribute;
    if (!skinIndex || !skinWeight) return;

    // soma pesos por bone nos 3 vértices da face
    const acc = new Map<number, number>();
    [intersect.face.a, intersect.face.b, intersect.face.c].forEach((vi) => {
      for (let k = 0; k < 4; k++) {
        const bi = skinIndex.getComponent(vi, k) as number;
        const w = skinWeight.getComponent(vi, k) as number;
        if (w > 0) acc.set(bi, (acc.get(bi) ?? 0) + w);
      }
    });
    // bone com maior peso
    let bestBone = -1, bestW = -1;
    acc.forEach((w, bi) => { if (w > bestW) { bestW = w; bestBone = bi; } });
    if (bestBone < 0) return;
    const boneName = sm.skeleton.bones[bestBone]?.name;
    if (!boneName) return;

    // mapeia para região postural
    let matched: PosturalRegion | null = null;
    (Object.keys(POSTURAL_BONES) as PosturalRegion[]).some((r) => {
      if (POSTURAL_BONES[r].includes(boneName)) { matched = r; return true; }
      return false;
    });
    if (matched) onRegionClick(matched);
  };

  useFrame(() => {
    if (!root.current) return;
    const t = performance.now() / 900;
    const s = 1 + Math.sin(t) * 0.004;
    root.current.scale.set(s, 1 + Math.sin(t * 1.07) * 0.003, s);
  });

  return (
    <group ref={root} position={[0, -0.95, 0]}>
      <primitive
        object={cloned}
        onClick={onRegionClick ? handleClick : undefined}
        onPointerOver={onRegionClick ? () => { document.body.style.cursor = "pointer"; } : undefined}
        onPointerOut={onRegionClick ? () => { document.body.style.cursor = "default"; } : undefined}
      />
    </group>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="text-xs text-muted-foreground animate-pulse">Carregando modelo 3D…</div>
    </Html>
  );
}

export default function Body3D(props: Props) {
  const h = props.height ?? 380;
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <div style={{ height: h }} className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-muted/40 to-background border border-border">
      {ready && (
        <Canvas
          camera={{ position: [0, 1.0, 3.6], fov: 32 }}
          dpr={[1, 1.75]}
          shadows
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[3, 5, 4]}
            intensity={1.3}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#a5b4fc" />
          <directionalLight position={[0, -1, 4]} intensity={0.25} color="#fde68a" />
          <Suspense fallback={<Loader />}>
            <Mannequin {...props} />
            <ContactShadows position={[0, -0.95, 0]} opacity={0.45} blur={2.4} far={3} />
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={2.2}
            maxDistance={5.5}
            target={[0, 0.9, 0]}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.6}
          />
        </Canvas>
      )}
    </div>
  );
}
