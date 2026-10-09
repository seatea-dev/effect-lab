# Image-effects playground

A browser-based creative tool for exploring image effects with sample images or personal uploads.

## Language

**Source image**:
The original image selected for editing, before any effect is applied. It may be a sample image or an uploaded image.
_Avoid_: Original preview, input preview

**Sample image**:
An image supplied with the playground that visitors can select without uploading a file.
_Avoid_: Placeholder image, demo upload

**Effect**:
One image transformation with adjustable parameters. Only one effect is active at a time in V1.
_Avoid_: Filter stack, preset

**Preset**:
A named effect and its predefined parameter values. A preset does not include a source image or a chain of effects.
_Avoid_: Effect, project, filter stack

**Preview**:
The displayed result of applying the current effect and parameter values to the source image.
_Avoid_: Export, source image

**Export**:
A downloadable PNG of the processed image using the current effect and parameter values.
_Avoid_: Screenshot, saved project
