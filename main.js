import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
// import { DragControls } from "three/addons/controls/DragControls.js";

const boneMenuContainer = document.getElementById("bone-menu-container");
const boneList = document.getElementById("bone-list");
let boneMap = new Map();
const undoStack = [];
const redoStack = [];
let actionInProgress = null;

function main() {
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    const gridHelper = new THREE.GridHelper(32, 32, 0x888888, 0x444444);
    scene.add(gridHelper);

    const largeGridHelper = new THREE.GridHelper(160, 10, 0x555555, 0x333333);
    scene.add(largeGridHelper);

    const modelContainer = new THREE.Group();
    modelContainer.scale.set(-1, 1, 1);
    //modelContainer.rotation.z = Math.PI;
    scene.add(modelContainer);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let draggableObjects = [];
    let selectionBoxHelper = null;
    const transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls);

    transformControls.addEventListener("dragging-changed", function (event) {
        controls.enabled = !event.value;
    });

    transformControls.addEventListener("objectChange", function () {
        if (transformControls.object) {
            transformControls.object.position.x = Math.round(transformControls.object.position.x);
            transformControls.object.position.y = Math.round(transformControls.object.position.y);
            transformControls.object.position.z = Math.round(transformControls.object.position.z);
        }
    });

    transformControls.addEventListener("mouseDown", function () {
        const object = transformControls.object;
        if (object) {
            actionInProgress = {
                boneName: object.name,
                oldState: {
                    position: object.position.clone(),
                    quaternion: object.quaternion.clone(),
                    scale: object.scale.clone(),
                },
            };
        }
    });

    transformControls.addEventListener("mouseUp", function () {
        if (actionInProgress) {
            const object = boneMap.get(actionInProgress.boneName);
            if (object) {
                const oldState = actionInProgress.oldState;
                const changed =
                    !object.position.equals(oldState.position) ||
                    !object.quaternion.equals(oldState.quaternion) ||
                    !object.scale.equals(oldState.scale);
                if (changed) {
                    undoStack.push(actionInProgress);
                    redoStack.length = 0;
                }
            }
            actionInProgress = null;
        }
    });

    window.addEventListener("pointerdown", function (event) {
        if (transformControls.dragging === true) return;
        if (event.target !== renderer.domElement) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(modelContainer.children, true);
        if (intersects.length > 0) {
            let object = intersects[0].object;
            let targetBone = null;
            while (object.parent) {
                if (draggableObjects.includes(object)) {
                    targetBone = object;
                    break;
                }
                object = object.parent;
            }
            if (targetBone) {
                // recenterPivot(targetBone);
                // transformControls.attach(targetBone);
                // if (selectionBoxHelper) scene.remove(selectionBoxHelper);
                // selectionBoxHelper = new THREE.BoxHelper(targetBone, 0xffff00);
                // scene.add(selectionBoxHelper);
                selectBoneByName(targetBone.name);
            }
        } else {
            if (transformControls.object) {
                transformControls.detach();
                if (selectionBoxHelper) {
                    scene.remove(selectionBoxHelper);
                    selectionBoxHelper.dispose();
                    selectionBoxHelper = null;
                }
                document.querySelectorAll(".bone-item.active").forEach((item) => item.classList.remove("active"));
            }
        }
    });

    window.addEventListener("keydown", function (event) {
        if (event.ctrlKey && event.key.toLowerCase() === "z") {
            event.preventDefault();
            undo();
        }
        if (event.ctrlKey && event.key.toLowerCase() === "y") {
            event.preventDefault();
            redo();
        }
    });

    // let selectionBoxHelper = null;
    // let dragControls;
    // function initDragControls(draggableObjects) {
    //     if (dragControls) {
    //         dragControls.deactivate();
    //         dragControls.dispose();
    //     }
    //     dragControls = new DragControls(draggableObjects, camera, renderer.domElement);
    //     dragControls.addEventListener("dragstart", function (event) {
    //         controls.enabled = false;
    //         if (selectionBoxHelper) {
    //             scene.remove(selectionBoxHelper);
    //             selectionBoxHelper.dispose();
    //         }
    //         selectionBoxHelper = new THREE.BoxHelper(event.object, 0xffff00); // warna kuning
    //         scene.add(selectionBoxHelper);
    //     });
    //     dragControls.addEventListener("dragend", function (event) {
    //         controls.enabled = true;
    //         if (selectionBoxHelper) {
    //             scene.remove(selectionBoxHelper);
    //             selectionBoxHelper.dispose();
    //             selectionBoxHelper = null;
    //         }
    //     });

    //     dragControls.addEventListener("drag", function (event) {
    //         event.object.position.x = Math.round(event.object.position.x);
    //         event.object.position.y = Math.round(event.object.position.y);
    //         event.object.position.z = Math.round(event.object.position.z);
    //         if (selectionBoxHelper) {
    //             selectionBoxHelper.update();
    //         }
    //     });
    // }

    const jsonInput = document.getElementById("jsonFile");
    const textureInput = document.getElementById("textureFile");
    const loadBtn = document.getElementById("loadBtn");
    const jsonFileLabel = document.getElementById("jsonFile-label");
    const textureFileLabel = document.getElementById("textureFile-label");
    const controlsPanel = document.getElementById("controls-panel");
    const menuToggleBtn = document.getElementById("menu-toggle");
    const closeControlsBtn = document.getElementById("close-controls");
    const geometrySelectorGroup = document.getElementById("geometry-selector-group");
    const geometrySelector = document.getElementById("geometrySelector");

    let modelData = null;
    let textureDataURL = null;

    jsonInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        jsonFileLabel.textContent = file.name;
        geometrySelectorGroup.classList.add("hidden");
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                modelData = JSON.parse(e.target.result);
                console.log("File model.json berhasil diparsing.");
            } catch (err) {
                alert("Error: File JSON tidak valid.");
                modelData = null;
            }
        };
        reader.readAsText(file);
    });

    textureInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        textureFileLabel.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => (textureDataURL = e.target.result);
        reader.readAsDataURL(file);
    });

    loadBtn.addEventListener("click", () => {
        if (!modelData || !textureDataURL) {
            alert("Harap pilih file model.json dan texture.png terlebih dahulu.");
            return;
        }

        const geometries = modelData["minecraft:geometry"];

        if (!geometries || geometries.length === 0) {
            alert("File JSON tidak berisi data geometri yang valid.");
            return;
        }

        if (geometries.length === 1) {
            geometrySelectorGroup.classList.add("hidden");
            loadAndRender(geometries[0], textureDataURL);
        } else {
            populateGeometrySelector(geometries);
            geometrySelectorGroup.classList.remove("hidden");
            alert("File ini berisi beberapa model. Silakan pilih satu dari dropdown.");
        }
    });

    function populateGeometrySelector(geometries) {
        geometrySelector.innerHTML = '<option value="">-- Select Model --</option>';
        geometries.forEach((geo, index) => {
            const identifier = geo.description.identifier || `No Name ${index + 1}`;
            const option = document.createElement("option");
            option.value = index;
            option.textContent = identifier;
            geometrySelector.appendChild(option);
        });
        geometrySelector.onchange = (event) => {
            const selectedIndex = event.target.value;
            if (selectedIndex !== "") {
                const selectedGeo = geometries[selectedIndex];
                loadAndRender(selectedGeo, textureUrl);
            }
        };
    }

    function populateBoneMenu(bonesData) {
        const boneTree = [];
        const map = new Map();
        bonesData.forEach((bone) => {
            map.set(bone.name, { ...bone, children: [] });
        });
        map.forEach((boneNode) => {
            if (boneNode.parent && map.has(boneNode.parent)) {
                map.get(boneNode.parent).children.push(boneNode);
            } else {
                boneTree.push(boneNode);
            }
        });
        boneList.innerHTML = "";
        createBoneElements(boneTree, boneList, 0);
    }

    function createBoneElements(bones, parentElement, level) {
        const basePadding = 12;
        const indentPerLevel = 15;
        bones.forEach((bone) => {
            const boneItem = document.createElement("div");
            boneItem.className = "bone-item";
            boneItem.textContent = bone.name;
            boneItem.style.paddingLeft = basePadding + level * indentPerLevel + "px";
            boneItem.addEventListener("click", () => {
                selectBoneByName(bone.name);
            });
            parentElement.appendChild(boneItem);
            if (bone.children.length > 0) {
                createBoneElements(bone.children, parentElement, level + 1);
            }
        });
    }

    function selectBoneByName(boneName) {
        const targetBone = boneMap.get(boneName);
        if (!targetBone) return;
        recenterPivot(targetBone);
        transformControls.attach(targetBone);
        if (selectionBoxHelper) scene.remove(selectionBoxHelper);
        selectionBoxHelper = new THREE.BoxHelper(targetBone, 0xffff00);
        scene.add(selectionBoxHelper);
        document.querySelectorAll(".bone-item").forEach((item) => {
            item.classList.toggle("active", item.textContent === boneName);
        });
    }

    // geometrySelector.addEventListener("change", (event) => {
    //     const selectedIndex = event.target.value;
    //     if (selectedIndex !== "") {
    //         const selectedGeo = modelData["minecraft:geometry"][selectedIndex];
    //         loadAndRender(selectedGeo);
    //     }
    // });

    // async function loadAndRender(geo, textureUrl) {
    //     if (!geo || !textureUrl) return;
    //     const bones = await loadModelAndTexture(modelContainer, geo, textureUrl, camera, controls);
    //     initDragControls(bones);
    //     controlsPanel.classList.add("hidden");
    //     menuToggleBtn.classList.remove("hidden");
    // }

    async function loadAndRender(geo, textureUrl) {
        if (!geo || !textureUrl) return;
        const bones = await loadModelAndTexture(modelContainer, geo, textureUrl, camera, controls);
        draggableObjects = bones;
        if (geo.bones && geo.bones.length > 0) {
            populateBoneMenu(geo.bones);
            boneMenuContainer.classList.remove("hidden");
        }
        if (!controlsPanel.classList.contains("hidden")) {
            controlsPanel.classList.add("hidden");
            menuToggleBtn.classList.remove("hidden");
        }
    }

    menuToggleBtn.addEventListener("click", () => {
        controlsPanel.classList.remove("hidden");
        menuToggleBtn.classList.add("hidden");
    });

    closeControlsBtn.addEventListener("click", () => {
        controlsPanel.classList.add("hidden");
        menuToggleBtn.classList.remove("hidden");
    });

    // loadModelAndTexture(modelContainer);

    function takeScreenshot() {
        const originalCamPos = camera.position.clone();
        const originalTarget = controls.target.clone();
        const originalBackground = scene.background ? scene.background.clone() : null;
        gridHelper.visible = false;
        largeGridHelper.visible = false;
        scene.background = null;
        renderer.setClearAlpha(0);
        const box = new THREE.Box3().setFromObject(modelContainer);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxSize / 1.5 / Math.tan(fov / 2));
        cameraZ *= 1.5;
        camera.position.set(center.x - cameraZ * 0.6, center.y + cameraZ * 0.4, center.z + cameraZ);
        controls.target.copy(center);
        controls.update();
        renderer.render(scene, camera);
        const mainCanvas = renderer.domElement;
        const context =
            mainCanvas.getContext("webgl2", { preserveDrawingBuffer: true }) ||
            mainCanvas.getContext("webgl", { preserveDrawingBuffer: true });
        const pixels = new Uint8Array(context.drawingBufferWidth * context.drawingBufferHeight * 4);
        context.readPixels(
            0,
            0,
            context.drawingBufferWidth,
            context.drawingBufferHeight,
            context.RGBA,
            context.UNSIGNED_BYTE,
            pixels
        );
        let top = context.drawingBufferHeight,
            left = context.drawingBufferWidth,
            right = 0,
            bottom = 0;
        for (let y = 0; y < context.drawingBufferHeight; y++) {
            for (let x = 0; x < context.drawingBufferWidth; x++) {
                const alpha = pixels[(y * context.drawingBufferWidth + x) * 4 + 3];
                if (alpha > 0) {
                    top = Math.min(top, y);
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    bottom = Math.max(bottom, y);
                }
            }
        }

        const cropWidth = right - left + 1;
        const cropHeight = bottom - top + 1;

        if (cropWidth <= 0 || cropHeight <= 0) {
            gridHelper.visible = true;
            largeGridHelper.visible = true;
            scene.background = originalBackground;
            renderer.setClearAlpha(1);
            alert("Model tidak terlihat untuk discreenshot.");
            return;
        }
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        const cropCtx = cropCanvas.getContext("2d");
        const imageData = new ImageData(
            new Uint8ClampedArray(pixels),
            context.drawingBufferWidth,
            context.drawingBufferHeight
        );
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = context.drawingBufferWidth;
        tempCanvas.height = context.drawingBufferHeight;
        tempCanvas.getContext("2d").putImageData(imageData, 0, 0);
        cropCtx.translate(0, cropHeight);
        cropCtx.scale(1, -1);
        cropCtx.drawImage(tempCanvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        const dataURL = cropCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = "model_screenshot.png";
        link.href = dataURL;
        link.click();

        camera.position.copy(originalCamPos);
        controls.target.copy(originalTarget);
        controls.update();
        gridHelper.visible = true;
        largeGridHelper.visible = true;
        scene.background = originalBackground;
        renderer.setClearAlpha(1);
    }

    const screenshotBtn = document.getElementById("screenshotBtn");
    screenshotBtn.addEventListener("click", takeScreenshot);

    function animate() {
        requestAnimationFrame(animate);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        if (selectionBoxHelper) {
            selectionBoxHelper.update();
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

function undo() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    const object = boneMap.get(action.boneName);
    if (object) {
        const redoAction = {
            boneName: object.name,
            oldState: {
                position: object.position.clone(),
                quaternion: object.quaternion.clone(),
                scale: object.scale.clone(),
            },
        };
        redoStack.push(redoAction);
        object.position.copy(action.oldState.position);
        object.quaternion.copy(action.oldState.quaternion);
        object.scale.copy(action.oldState.scale);
    }
}

function redo() {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    const object = boneMap.get(action.boneName);
    if (object) {
        const undoAction = {
            boneName: object.name,
            oldState: {
                position: object.position.clone(),
                quaternion: object.quaternion.clone(),
                scale: object.scale.clone(),
            },
        };
        undoStack.push(undoAction);
        object.position.copy(action.oldState.position);
        object.quaternion.copy(action.oldState.quaternion);
        object.scale.copy(action.oldState.scale);
    }
}

function recenterPivot(object) {
    if (object.children.length === 0) return;
    const worldCenter = new THREE.Vector3();
    new THREE.Box3().setFromObject(object).getCenter(worldCenter);
    const localCenter = object.worldToLocal(worldCenter.clone());
    if (localCenter.lengthSq() === 0) return;
    for (const child of object.children) {
        child.position.sub(localCenter);
    }
    const offsetInParentSpace = localCenter.clone().applyQuaternion(object.quaternion);
    object.position.add(offsetInParentSpace);
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

async function loadModelAndTexture(parentGroup, geo, textureDataURL, camera, controls) {
    try {
        while (parentGroup.children.length > 0) {
            const child = parentGroup.children[0];
            parentGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        const textureLoader = new THREE.TextureLoader();

        const texture = await textureLoader.loadAsync(textureDataURL);
        texture.colorSpace = THREE.SRGBColorSpace;

        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.flipY = false;

        const textureWidth = geo.description.texture_width;
        const textureHeight = geo.description.texture_height;
        const allBones = new Map();

        // const bonesToRender = geo.bones.filter(
        //     (b) =>
        //         // b.name === "root" ||
        //         // b.name === "waist" ||
        //         b.name === "head" || b.name === "lower_beak" //||
        //     //     b.name === "hat" ||
        //     //     b.name === "leftArm" ||
        //     //     b.name === "leftSleeve" ||
        //     //     b.name === "rightArm" ||
        //     //     b.name === "rightSleeve" ||
        //     //     b.name === "jacket"
        // );
        boneMap.clear();
        boneList.innerHTML = "";
        boneMenuContainer.classList.add("hidden");

        const bonesToRender = geo.bones;
        const createdBoneGroups = [];

        for (const boneData of bonesToRender) {
            if (boneData.pivot) {
                boneData.pivot[0] *= -1;
                boneData.pivot[2] *= -1;
            }
            const boneGroup = new THREE.Group();
            boneGroup.name = boneData.name;
            boneMap.set(boneData.name, boneGroup);
            allBones.set(boneData.name, boneGroup);
            createdBoneGroups.push(boneGroup);

            const pivot = [...(boneData.pivot || [0, 0, 0])];
            const rotation = [...(boneData.rotation || [0, 0, 0])];
            //pivot[0] *= -1;
            boneGroup.position.set(pivot[0], pivot[1], pivot[2]);
            boneGroup.rotation.order = "ZYX";
            boneGroup.rotation.set(
                THREE.MathUtils.degToRad(rotation[0]),
                THREE.MathUtils.degToRad(rotation[1]),
                THREE.MathUtils.degToRad(rotation[2])
            );

            if (boneData.cubes) {
                for (const cubeData of boneData.cubes) {
                    const inflate = cubeData.inflate || 0;
                    const size = [...cubeData.size];
                    const origin = [...(cubeData.origin || [0, 0, 0])];
                    if (size[0] === 0) size[0] = 0.01;
                    if (size[1] === 0) size[1] = 0.01;
                    if (size[2] === 0) size[2] = 0.01;
                    origin[0] = -(origin[0] + size[0]);
                    origin[2] = -(origin[2] + size[2]);
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
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            alphaTest: 0.5,
                        });
                    } else {
                        material = new THREE.MeshLambertMaterial({
                            map: texture,
                            transparent: true,
                            side: THREE.DoubleSide,
                            alphaTest: 0.5,
                        });
                    }
                    const mesh = new THREE.Mesh(geometry, material);
                    if (isOuterLayer) {
                        mesh.renderOrder = 1;
                    } else {
                        mesh.renderOrder = 0;
                    }

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
        await new Promise((resolve) => setTimeout(resolve, 0));
        const box = new THREE.Box3().setFromObject(parentGroup);
        if (box.isEmpty()) return;
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const fov = camera.fov * (Math.PI / 180);
        const diagonal = size.length();
        let cameraDist = diagonal / 2 / Math.tan(fov / 2);
        cameraDist *= 1.2;
        camera.position.set(center.x - cameraDist * 0.5, center.y + cameraDist * 0.5, center.z + cameraDist * 0.5);
        controls.target.copy(center);
        controls.update();
        return createdBoneGroups;
    } catch (error) {
        console.error("Gagal memuat model:", error);
        alert("Terjadi error saat memuat model. Cek console (F12) untuk detail.");
    }
}

function applyUvToCube(geometry, cubeData, texWidth, texHeight) {
    const { uv, size, mirror = false } = cubeData;
    const [w, h, d] = size;
    const uvAttr = geometry.attributes.uv;

    // urutan Three.js: right, left, top, bottom, front, back
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
