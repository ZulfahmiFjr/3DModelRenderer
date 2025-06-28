# Minecraft Bedrock 3D Model Renderer

An interactive webbased tool built to load and display geometry 3d models from Minecraft Bedrock Edition right in your browser. This project was developed from scratch using Three.js and tackles several rendering challenges to faithfully reproduce models as they appear in Blockbench.

🌐 **[Live Demo](https://ZulfahmiFjr.github.io/3DModelRenderer/)**

Here’s an example of a Sniffer and Player model rendered inside the viewer.
![picture 0](https://raw.githubusercontent.com/ZulfahmiFajri/ProgDas/main/caches/31f85b3217c70ff468486f104fe668d004d268e4e98af5f3d1b8dd4dde41696e.png)

![picture 1](https://raw.githubusercontent.com/ZulfahmiFajri/ProgDas/main/caches/ce38bb3d03206b15af9a5194fd7ad057f869bbe42fed99780fb66b0acbbe49c2.png)

---

## ✨ Key Features

-   **Dynamic Model Loading**
    Upload your own `model in .json` and `texture in .png` files directly through the interface.

-   **Accurate Rendering**
    Translates Bedrock’s coordinate system and rotation order precisely to Three.js, ensuring your model’s pose and orientation match exactly as seen in `Blockbench`.

-   **Advanced Transparency Handling**
    Implements `alphaTest` and `renderOrder` to properly display transparent sections, including inflated outer layers and semitransparent textures, while also addressing Z-fighting issues.

-   **Support for Complex Geometry**
    Correctly renders zero-dimension cubes (e.g. `size: [x, 0, z]`) as flat planes.

-   **Smart Screenshot Tool**
    Capture clean screenshots with one click:

    -   Transparent background.
    -   A dynamic pseudo-3D camera angle.
    -   Auto-cropping to perfectly frame your model.

-   **Interactive 3D Environment**

    -   Full camera control via OrbitControls (rotate, pan, zoom).
    -   Ground grid with 1:1 scale for easy size reference.
    -   Basic lighting setup (ambient and directional) to add depth.

-   **Modern, Responsive UI**
    A clean and collapsible control panel keeps your workspace neat and maximizes the viewing area.

---

## 🚀 Tech Stack

-   **Three.js** – Handles all 3D rendering via WebGL.
-   **HTML5 & CSS3** – For layout and styling, including the sleek control panel.
-   **JavaScript (ES6 Modules)** – Powers everything from loading to interaction.

---

## 🛠️ How to Use

1. Open the [live demo](https://ZulfahmiFjr.github.io/3DModelRenderer/).
2. In the topleft control panel, choose your files:

    - **Model Geometry**: Select your `model.json`.
    - **Model Texture**: Select the corresponding `texture.png`.

3. Click **Load Model**.
4. Your model will be displayed. Use your mouse to explore:

    - **Left Click + Drag**: Rotate (orbit) the camera.
    - **Right Click + Drag**: Pan the view.
    - **Scroll Wheel**: Zoom in and out.

5. To save an image of your model, click the **Take Screenshot** button in the control panel. This will generate a PNG file.

---
