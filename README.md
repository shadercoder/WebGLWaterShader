WebGLWaterShader
================

-------------------
11.23 Dev Note   by   Guanyu He
--------------------

Today I attemped to do the simulation and rendering using GLSL.

There are generally 3 programs that is required to implement the simulation. I stored the height and the velocity data of each grid point in the Texture. The green is velocity, and the blue is height.

The three programs are:

1. simulationProgram, with vs-sim and fs-sim. The usage of it was to deal with the simulation. The output was the rttTexture, as described before
2. copyProgram, with vs-copy and fs-copy. The usage of it was to copy the rttTexture to a copyTexture.
3. shaderProgram, with vs-render and fs-render. The usage of it was to rendering the final result.

---
Why needed a copyTexture?
---

Because the simulationProgram need to the velocity and heightfield data as both input and the output. But according to webGL, it cannot use one texture to be input and output simutaneously. Therefore, another
temporary texture is required to be used in calculating

---
What I learned and what is tricky?
---

First, I spent very long time to figure out that the WebGL do not support NPOT(none power of two) resolution of the texture. 

Second, the RGBA Texture will automatically clamp its data to (0,1), and the precision was only 8 bits for each element. Therefore, it had a lot of problem with data storage problem. I attemped to use OES_texture_float
 extension but still not work. Need to figure it out
 
Third, it took me long to figure out the problem that renderbuffer do not work(I follow some lesson code which include this feature, and still do not understand why they need these code). Anyway, after I remove
 it ,things are going correctly.
 
Fourth, I spent 1 hour to find out that I mistakenly write gl_Position = (position,0,0) in the vertex shader!!!! Almost rewrite every piece of code to figure out this problem! So fatal!!!
 
---
What now and next
---

So I currently have a very simple water simulator, but no rendering at all. Hao has been working on Skybox I believe. 

The next step was to add the normal, illumination and turbulence in it so that the ocean looks better.  It was expected to be finished tomorrow.

Before alpha presentation, I would like to add reflection and some very simple meshes in it.

