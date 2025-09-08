# Visage: Your AI Creation Studio

*A creative partner for turning your ideas into stunning images and illustrated stories.*

Visage is a modern, responsive web application built with Next.js that serves as a powerful studio for AI-powered content creation. It provides seamless interfaces to interact with state-of-the-art AI models, allowing you to create visuals from text, generate detailed stories from a single idea, or let your kids explore their imagination in a safe, fun environment.

## ✨ Core Features

-   ### **Studio Mode**
    A powerful interface for advanced users with detailed controls for image generation.
    -   **Text-to-Image**: Write a prompt and see it come to life with fine-tuned settings.
    -   **Sketch-to-Image**: Draw a simple sketch, and our AI will interpret it into a detailed prompt for you to use.
    -   **Image-to-Image**: Upload an image and provide a text prompt to guide the AI in editing or transforming it.
    -   **Chat Mode**: Engage in a multimodal conversation with the AI. Ask questions, get text replies, and generate images all within a single chat thread.
    -   **Advanced Controls**: Fine-tune your creations with settings for aspect ratio, styles, camera angles, and more.
    -   **Prompt Optimizer**: Automatically enhance your ideas with an AI-powered prompt engineer to get more vivid and detailed results.
    -   **Seamless Editing Workflow**: Instantly send any generated image to the Image-to-Image editor using the "Edit this Image" button, without needing to download and re-upload.

-   ### **Story Mode**
    A new creative mode that generates a multi-scene, illustrated story from a single idea.
    -   **Idea to Story**: Provide a simple prompt, and the AI will write a complete story, divided into panels.
    -   **AI Illustration**: Each panel of the story is accompanied by a unique, AI-generated image that visually represents the narrative.
    -   **Customization**: Choose the genre, artistic style, and length of your story (from 6 to 36 panels).
    -   **Consistent Visuals**: The AI is instructed to maintain character and environment consistency across all generated images.
    -   **Session Persistence**: Your most recently created story is automatically kept for you. The app will warn you before you overwrite it with a new creation.
    -   **Downloadable Package**: Export your entire story as a .zip file containing all the images and a markdown file with the full narrative.

-   ### **Kids Mode**
    A simplified, fun interface for children to create images safely.
    -   **Easy-to-Use Menus**: Kids can choose a place, add characters, and select fun props from simple, icon-based menus.
    -   **Multiple Art Styles**: Create images in various styles like Coloring Page, Cartoon, Claymation, and more.
    -   **Session History**: The last 10 creations are automatically saved in the browser, allowing kids to revisit and download their favorite pictures.
    -   **Full-Screen Viewer**: View and download the final image in a large, immersive viewer.

-   ### **General Features**
    -   **Session History**: Your last 10 generations in Studio and Kids mode are automatically saved in your browser for the current session.
    -   **Secure & Private**: All API keys are stored exclusively in your browser's local storage and are never sent to our servers.

## ✨ Coming Soon

-   **Adventure Log & On-Demand Generation**: Review your past choices in Adventurer mode and then generate all the scene and character images for your completed adventure at once.
-   **Stability API Integration**: Integrate Stability AI to provide users with more powerful and flexible image generation options, helping to manage API quotas.
-   **Narrator for Story Mode**: Bring your stories to life with AI-powered narration.
-   **Story Soundtracks**: Generate a unique, AI-powered musical score to accompany your stories, enhancing the mood and atmosphere of the narrative.
-   **Video Mode**: Generate short video clips from your images and stories, complete with animated panels and narration.
-   **Live Music Generation**: Create original music from text prompts or by humming a melody.
-   **Flow Mode**: An advanced node-based interface for chaining multiple AI actions together to create complex, multi-step generation workflows.
-   **Multi-Modal Support**: Combine text, images, and audio in a single prompt for truly unique and complex creations.
-   **Multi-lingual Support**: Full support for generating content and using the interface in multiple languages.

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **AI**: [Google's Gemini & Imagen 4 models](https://ai.google.dev/docs)
-   **UI**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
-   **Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Local Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for session history persistence.

## 💡 How to Use

1.  From the home page, select your desired mode: **Studio**, **Story**, or **Kids**.
2.  **In the Studio**:
    -   Configure image output settings in the collapsible side panel.
    -   Choose your input mode: **Text**, **Sketch**, **Image-to-Image**, or **Chat**.
    -   Write, draw, or speak your prompt. For Image-to-Image, upload an image and describe your desired changes.
    -   (Optional) Use the "Optimize" button to let the AI improve your prompt.
    -   Click "Generate", "Analyze Sketch", or send a message in Chat mode.
    -   When viewing a generated image, click "Edit this Image" to send it directly to the Image-to-Image editor.
3.  **In Story Mode**:
    -   Enter your initial story idea.
    -   Select an artistic style, genre, and the desired length of the story.
    -   Click "Create Story" and watch as the AI generates the narrative and illustrations panel by panel.
    -   Use the carousel to navigate through your story.
    -   Your current story is saved until you create a new one. The app will warn you before overwriting it.
    -   Download individual images or the entire story as a zip file.
4.  **In Kids Mode**:
    -   Choose a style, a place, and add characters or fun things from the easy-to-use menus.
    -   Click "Create!" to see your scene come to life.
    -   View your creation, download it, or click on it to see it in a full-screen viewer.
    -   Your past 10 creations are saved on the right, so you can easily go back to them!
