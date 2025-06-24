import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function main() {
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 16, 40);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(10, 20, 15);
    scene.add(directionalLight);

    const modelContainer = new THREE.Group();
    modelContainer.scale.set(-1, 1, 1);
    //modelContainer.rotation.z = Math.PI;
    scene.add(modelContainer);

    loadModelAndTexture(modelContainer);

    function animate() {
        requestAnimationFrame(animate);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

async function loadModelAndTexture(parentGroup) {
    try {
        const textureLoader = new THREE.TextureLoader();
        const fileLoader = new THREE.FileLoader();

        const [texture, jsonText] = await Promise.all([
            textureLoader.loadAsync("texture.png"),
            fileLoader.loadAsync("model.json"),
        ]);

        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.flipY = false;

        const modelData = JSON.parse(jsonText);
        const geometries = modelData["minecraft:geometry"];
        const geo = geometries.find((g) => g.description.identifier === "geometry.humanoid.custom");

        if (!geo) {
            alert("Model 'geometry.humanoid.custom' tidak ditemukan di file JSON.");
            return;
        }

        const textureWidth = geo.description.texture_width;
        const textureHeight = geo.description.texture_height;
        const allBones = new Map();

        // const bonesToRender = geo.bones.filter(
        //     (b) =>
        //         b.name === "root" ||
        //         b.name === "waist" ||
        //         b.name === "body" ||
        //         b.name === "head" ||
        //         b.name === "hat" ||
        //         b.name === "leftArm" ||
        //         b.name === "leftSleeve" ||
        //         b.name === "rightArm" ||
        //         b.name === "rightSleeve" ||
        //         b.name === "jacket"
        // );
        const bonesToRender = geo.bones;

        for (const boneData of bonesToRender) {
            const boneGroup = new THREE.Group();
            boneGroup.name = boneData.name;
            allBones.set(boneData.name, boneGroup);

            const pivot = boneData.pivot || [0, 0, 0];
            const rotation = boneData.rotation || [0, 0, 0];
            pivot[0] *= -1;
            rotation[1] *= -1;
            rotation[2] *= -1;
            boneGroup.position.set(pivot[0], pivot[1], pivot[2]);

            if (boneData.rotation) {
                boneGroup.rotation.set(
                    THREE.MathUtils.degToRad(rotation[0]),
                    THREE.MathUtils.degToRad(rotation[1]),
                    THREE.MathUtils.degToRad(rotation[2])
                );
            }

            if (boneData.cubes) {
                for (const cubeData of boneData.cubes) {
                    const inflate = cubeData.inflate || 0;
                    const size = cubeData.size;
                    let origin = cubeData.origin || [0, 0, 0];
                    origin[0] = -(origin[0] + size[0]);
                    const finalOrigin = [origin[0] - inflate, origin[1] - inflate, origin[2] - inflate];
                    const geometry = new THREE.BoxGeometry(
                        size[0] + inflate * 2,
                        size[1] + inflate * 2,
                        size[2] + inflate * 2
                    );

                    applyUvToCube(geometry, cubeData, textureWidth, textureHeight);

                    const isOuterLayer = inflate > 0;
                    let material;

                    if (isOuterLayer) {
                        material = new THREE.MeshLambertMaterial({
                            map: texture,
                            transparent: true,
                            depthWrite: false,
                        });
                    } else {
                        material = new THREE.MeshLambertMaterial({
                            map: texture,
                        });
                    }
                    const mesh = new THREE.Mesh(geometry, material);

                    mesh.position.set(
                        finalOrigin[0] - pivot[0] + (size[0] + inflate * 2) / 2,
                        finalOrigin[1] - pivot[1] + (size[1] + inflate * 2) / 2,
                        finalOrigin[2] - pivot[2] + (size[2] + inflate * 2) / 2
                    );

                    boneGroup.add(mesh);
                }
            }
        }

        for (const boneData of bonesToRender) {
            const bone = allBones.get(boneData.name);
            if (boneData.parent && allBones.has(boneData.parent)) {
                const parentBone = allBones.get(boneData.parent);
                const parentData = bonesToRender.find((b) => b.name === boneData.parent);
                if (parentData) {
                    let parentPivot = parentData.pivot || [0, 0, 0];
                    let childPivot = boneData.pivot || [0, 0, 0];
                    //parentPivot[0] *= -1;
                    bone.position.set(
                        childPivot[0] - parentPivot[0],
                        childPivot[1] - parentPivot[1],
                        childPivot[2] - parentPivot[2]
                    );
                    parentBone.add(bone);
                }
            } else {
                parentGroup.add(bone);
            }
        }
    } catch (error) {
        console.error("Gagal memuat model:", error);
        alert("Terjadi error saat memuat model. Cek console (F12) untuk detail.");
    }
}

function applyUvToCube(geometry, cubeData, texWidth, texHeight) {
    const { uv, size, mirror = false } = cubeData;
    const [w, h, d] = size;
    const uvAttr = geometry.attributes.uv;

    // Blockbench/BEDROCK CUBE UV MAP, urutan Three.js: right, left, top, bottom, front, back
    let faces = [
        [uv[0], uv[1] + d, d, h], // right (+X)
        [uv[0] + d + w, uv[1] + d, d, h], // left  (-X)
        [uv[0] + d, uv[1], w, d], // top   (+Y)
        [uv[0] + d + w, uv[1], w, d], // bottom(-Y)
        [uv[0] + d, uv[1] + d, w, h], // front (+Z)
        [uv[0] + d + w + d, uv[1] + d, w, h], // back  (-Z)
    ];

    if (mirror) {
        [faces[0], faces[1]] = [faces[1], faces[0]];
    }
    const uvInsetX = 0.1 / texWidth;
    const uvInsetY = 0.1 / texHeight;

    for (let i = 0; i < 6; i++) {
        const [u, v, fw, fh] = faces[i];
        const u0 = u / texWidth + uvInsetX;
        const v0 = v / texHeight + uvInsetY;
        const u1 = (u + fw) / texWidth - uvInsetX;
        const v1 = (v + fh) / texHeight - uvInsetY;
        if (i === 3) {
            uvAttr.setXY(i * 4 + 0, u0, v1);
            uvAttr.setXY(i * 4 + 1, u1, v1);
            uvAttr.setXY(i * 4 + 2, u0, v0);
            uvAttr.setXY(i * 4 + 3, u1, v0);
        } else {
            uvAttr.setXY(i * 4 + 0, u1, v0);
            uvAttr.setXY(i * 4 + 1, u0, v0);
            uvAttr.setXY(i * 4 + 2, u1, v1);
            uvAttr.setXY(i * 4 + 3, u0, v1);
        }
    }
    uvAttr.needsUpdate = true;
}

main();
