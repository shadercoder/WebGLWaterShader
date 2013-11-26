////////////////COPYRIGHT DECLARATION//////////////////////
//////
//////   COPYRIGHT  GUANYU HE AND HAO WU, 2013
//////   ALL THE FOLLOWING CODE IS PROTECTED BY THE COPYRIGHT
//////
//////   THE CODE IN THIS FILE CANNOT BE REUSED OUTSIDE CIS565 GPU PROGRAMMING COURSE
//////   IN UNIVERSITY OF PENNSYLVANIA UNLESS SPECIAL AUTHORIZATION.
//////
//////   CONTACT INFO: heguanyu9037@gmail.com
//////       		   wuhao1117@gmail.com
//////        
////////////////FILE INFO ///////////////////////////////
//////   THIS IS THE MAIN FILE OF THE WATER RENDERING
//////   INCLUDING THE SETUP OF THE 3 PASSES IN RENDERING
//////
//////
//////
//////
////////////////////////////////////////////////////////////

var gl;
var debugarea;
var NUM_WIDTH_PTS=128;
var NUM_HEIGHT_PTS=NUM_WIDTH_PTS;
var starttime;
var canvas = document.getElementById("canvas");

/*var persp = mat4.create();
mat4.perspective(60, 1.0, 0.1, 1000.0, persp);
var eye = [0.0, 6.0, 4.0];
var center = [0.0, -2.0,2.0];
var up = [0.0, 0.0, 1.0];
var view = mat4.create();
mat4.lookAt(eye, center, up, view);*/
var heightfield;
var velfield;

var u_modelViewPerspectiveLocation;
var u_modelViewPerspectiveLocation_Inverse_Transpose;
var u_modelLocation;

var curtime=0.0;
var totalframes;

var canvasheight;
var canvaswidth;

var simpositionbuffer;
var simindicesbuffer;

var waterfacepositionbuffer;
var waterfaceindicesbuffer;
var waterfacenormalbuffer;

var sim_utimeloc;
var shader_utimeloc;
var copy_utimeloc;

var simulateProgram;
var shaderProgram;
var copyProgram;

var rttFramebuffer;
var rttTexture;

var copyFramebuffer;
var copyTexture;

var normals;
var positions;
var positions_World;
var model;

/////////////////////////////////////////mouse control//////////////////////////////////
//Camera control
var mouseLeftDown = false;
var mouseRightDown = false;
var lastMouseX = null;
var lastMouseY = null;

var radius = 35.0;
var azimuth = Math.PI / 2.0-Math.PI / 2.0;
var zenith = Math.PI / 2.4;

var center = [0.0, 5.0, 0.0];
var up = [0.0, 1.0, 0.0];

var persp;
var eye;
var view;

// mouse control callbacks
function handleMouseDown(event) {
    if (event.button == 2) {
        mouseLeftDown = false;
        mouseRightDown = true;
    }
    else {
        mouseLeftDown = true;
        mouseRightDown = false;
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseLeftDown = false;
    mouseRightDown = false;
}

function handleMouseMove(event) {
    if (!(mouseLeftDown || mouseRightDown)) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    if (mouseLeftDown) {
        azimuth -= 0.01 * deltaX;
        zenith -= 0.01 * deltaY;
        zenith = Math.min(Math.max(zenith, 0.001), Math.PI - 0.001);
    }
    else {
        radius += 0.01 * deltaY;
        radius = Math.min(Math.max(radius, 2.0), 100.0);
    }
    eye = sphericalToCartesian(radius, azimuth, zenith);
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    lastMouseX = newX;
    lastMouseY = newY;
}
/*
function sphericalToCartesian(r, azimuth, zenith) {
	var x = r * Math.sin(zenith) * Math.cos(azimuth);
    var y = r * Math.sin(zenith) * Math.sin(azimuth);    
    var z = r * Math.cos(zenith);

    return [x, y, z];
 }*/
function sphericalToCartesian(r, azimuth, zenith) {
    var x = r * Math.sin(zenith) * Math.sin(azimuth);
    var y = r * Math.cos(zenith);
    var z = r * Math.sin(zenith) * Math.cos(azimuth);

    return [x, y, z];

}
////////////////////////////////////////skybox program/////////////////////////////////
var programSkybox;

var skyboxPositionLocation;

var u_skyboxViewLocation;
var u_skyboxPerspLocation;

var u_cubeTextureLocation;

function initSkyboxShader() {
	// create programGlobe for skybox shading
	var skyboxVS = getShader(gl, "skyboxVS");
    var skyboxFS = getShader(gl, "skyboxFS");

    programSkybox = gl.createProgram();
    gl.attachShader(programSkybox, skyboxVS);
    gl.attachShader(programSkybox, skyboxFS);
    gl.linkProgram(programSkybox);
    if (!gl.getProgramParameter(programSkybox, gl.LINK_STATUS)) {
        alert("Could not initialise Skybox shader");
    }
  
    skyboxPositionLocation = gl.getAttribLocation(programSkybox, "Position");

    u_skyboxViewLocation = gl.getUniformLocation(programSkybox, "u_View");
    u_skyboxPerspLocation = gl.getUniformLocation(programSkybox, "u_Persp");
    
    u_cubeTextureLocation = gl.getUniformLocation(programSkybox, "u_cubeTexture");

}


var skyboxTex;

function initSkyboxTex() {
	
	skyboxTex = gl.createTexture();	
    // javaScript arrays can be of mixed types
    var cubeImages = [[gl.TEXTURE_CUBE_MAP_POSITIVE_X, "desertsky_ft.png"],
                      [gl.TEXTURE_CUBE_MAP_NEGATIVE_X, "desertsky_bk.png"],
                      [gl.TEXTURE_CUBE_MAP_POSITIVE_Y, "desertsky_up.png"],
                      [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, "desertsky_dn.png"],
                      [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, "desertsky_rt.png"],
                      [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, "desertsky_lf.png"]];

    // While a texture is bound, GL operations on the target to which it is
    // bound affect the bound texture, and queries of the target to which it
    // is bound return state from the bound texture.
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    /*function initLoadedCubeMap(texture, face, image) {
    	//alert(image.complete);
    	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    	gl.texImage2D(face, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    	//message.innerHTML += image.complete + "\n";
    	
    	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }*/
    
    for (var i = 0; i < cubeImages.length; i++) {
        var face = cubeImages[i][0];
        var image = new Image();
        image.onload = function(texture, face, image) {
            return function() {
            	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            };
        } (skyboxTex, face, image);
        // image load functions that do not work
        /*image.onload = function() {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        };*/
        /* image.onload = function() {
        	return initLoadedCubeMap(skyboxTex, face, image)
        };*/
        image.src = cubeImages[i][1];
    }
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

}


var skyboxPosBuffer;
var skyboxIndices;
var numberOfSkyboxIndices;

function intializeSkybox() {
	var positions = new Float32Array([
	      // neg z, back                            	
          -50.0, 50.0, -50.0, -50.0, -50.0, -50.0, 50.0, -50.0, -50.0,
          50.0, -50.0, -50.0, 50.0, 50.0, -50.0, -50.0, 50.0, -50.0,
          // neg x, left
          -50.0, -50.0, 50.0, -50.0, -50.0, -50.0, -50.0, 50.0, -50.0,
          -50.0, 50.0, -50.0, -50.0, 50.0, 50.0, -50.0, -50.0, 50.0,
          // pos x, right
          50.0, -50.0, -50.0, 50.0, -50.0, 50.0, 50.0, 50.0, 50.0,
          50.0, 50.0, 50.0, 50.0, 50.0, -50.0, 50.0, -50.0, -50.0,
          // pos z, front
          -50.0, -50.0, 50.0, -50.0, 50.0, 50.0, 50.0, 50.0, 50.0,
          50.0, 50.0, 50.0, 50.0, -50.0, 50.0, -50.0, -50.0, 50.0,
          // pos y, top
          -50.0, 50.0, -50.0, 50.0, 50.0, -50.0, 50.0, 50.0, 50.0,
          50.0, 50.0, 50.0, -50.0, 50.0, 50.0, -50.0, 50.0, -50.0,
          // neg y, bottom
          -50.0, -50.0, -50.0, -50.0, -50.0, 50.0, 50.0, -50.0, -50.0,
          50.0, -50.0, -50.0, -50.0, -50.0, 50.0, 50.0, -50.0, 50.0
          ]);

    var indices = new Uint16Array(6 * 2 * 3);
    for (var i = 0; i < indices.length; ++i) {
        indices[i] = i;
    }
    
    // Positions
    skyboxPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
   
    // Indices
    skyboxIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    numberOfSkyboxIndices = indices.length;

}


function drawSkybox(){
	gl.useProgram(programSkybox);

    // enable attributes for this program
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPosBuffer);
    gl.vertexAttribPointer(skyboxPositionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(skyboxPositionLocation);

    // calculate and pass uniforms
    gl.uniformMatrix4fv(u_skyboxViewLocation, false, view);
    gl.uniformMatrix4fv(u_skyboxPerspLocation, false, persp);

    // pass textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTex);
    gl.uniform1i(u_cubeTextureLocation, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndices);
    gl.drawElements(gl.TRIANGLES, numberOfSkyboxIndices, gl.UNSIGNED_SHORT, 0);
    
    gl.disableVertexAttribArray(skyboxPositionLocation);
}

////////////////////////////////////////skybox program/////////////////////////////////


function Vec3(x,y,z)
{
    this.x=x;
    this.y=y;
    this.z=z;
}
function vecCross(a,b)
{
    return new Vec3(a.y* b.z- b.y* a.z, (b.x* a.z- a.x* b.z), a.x* b.y-  b.x*a.y);
}
function vecAdd(a,b)
{
    return new Vec3(a.x+ b.x, a.y+ b.y, a.z+ b.z);
}
function vecMinus(a,b)
{
    //alert(a);
    return new Vec3(a.x- b.x, a.y- b.y, a.z- b.z);
}
function vecMultiply(a,b)
{
    return new Vec3(a.x*b, a.y*b, a.z*b);
}

function vecLength(a)
{
    return Math.sqrt(a.x* a.x+ a.y* a.y+ a.z* a.z);
}
function vecNormalize(a)
{
    var l=vecLength(a);
    if(l<0.0000001) return a;
    return new Vec3(a.x/l, a.y/l,a.z/l);
}

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");

        canvaswidth = canvas.width;
        canvasheight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initSimShader() {
    var vertexShader = getShader(gl, "vs_sim");
    var fragmentShader = getShader(gl, "fs_sim");

    simulateProgram = gl.createProgram();
    gl.attachShader(simulateProgram, vertexShader);
    gl.attachShader(simulateProgram, fragmentShader);
    gl.linkProgram(simulateProgram);
    if (!gl.getProgramParameter(simulateProgram, gl.LINK_STATUS)) {
        alert("Could not initialise Simulation shader");
    }
    gl.useProgram(simulateProgram);

    simulateProgram.vertexPositionAttribute = gl.getAttribLocation(simulateProgram, "position");
    gl.enableVertexAttribArray(simulateProgram.vertexPositionAttribute);
    sim_utimeloc = gl.getUniformLocation(simulateProgram, "u_time");
    simulateProgram.samplerUniform = gl.getUniformLocation(simulateProgram, "uSampler");
}
function initCopyShader()
{
    var vertexShader = getShader(gl, "vs_copy");
    var fragmentShader = getShader(gl, "fs_copy");

    copyProgram = gl.createProgram();
    gl.attachShader(copyProgram, vertexShader);
    gl.attachShader(copyProgram, fragmentShader);
    gl.linkProgram(copyProgram);

    if (!gl.getProgramParameter(copyProgram, gl.LINK_STATUS)) {
        alert("Could not initialise copying shaders");
    }

    gl.useProgram(copyProgram);

    copyProgram.vertexPositionAttribute = gl.getAttribLocation(copyProgram, "position");
    gl.enableVertexAttribArray(copyProgram.vertexPositionAttribute);

    copy_utimeloc = gl.getUniformLocation(copyProgram, "u_time");
    copyProgram.samplerUniform = gl.getUniformLocation(copyProgram, "uSampler");

}

function initRenderShader()
{
    var vertexShader = getShader(gl, "vs_render");
    var fragmentShader = getShader(gl, "fs_render");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise rendering shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "position");
    //gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "normal");
    //gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    u_modelViewPerspectiveLocation = gl.getUniformLocation(shaderProgram,"u_modelViewPerspective");
    u_modelViewPerspectiveLocation_Inverse_Transpose = gl.getUniformLocation(shaderProgram,"u_modelViewPerspective_Inverse_Transpose");
    u_modelLocation = gl.getUniformLocation(shaderProgram, "u_model");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shader_utimeloc= gl.getUniformLocation(shaderProgram, "u_time");

}


function initTextureFramebuffer()
{
    rttFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    rttFramebuffer.width = NUM_HEIGHT_PTS;
    rttFramebuffer.height = NUM_HEIGHT_PTS;

    rttTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);



    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


function initCopyTextureFramebuffer()
{
    copyFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, copyFramebuffer);
    copyFramebuffer.width = NUM_HEIGHT_PTS;
    copyFramebuffer.height = NUM_HEIGHT_PTS;

    copyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, copyFramebuffer.width, copyFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);




    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copyTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function translateGridCoord(i,j,w)
{
    return i+j*w;
}


function initGrid()
{
    var w=NUM_WIDTH_PTS;
    var h=NUM_HEIGHT_PTS;

    positions = new Float32Array(w*h*3);
    positions_World = new Float32Array(w*h*3);

    normals = new Float32Array(w*h*3);

    for(var i=0;i<w;i++)for(var j=0;j<h;j++)
    {
        var idx=translateGridCoord(i,j,w);
        positions[idx*3]=i/(w-1);
        positions[idx*3+1]=0.0;
        ////Y is up
        positions[idx*3+2] = j/(h-1);

        normals[idx*3]=0.0;
        normals[idx*3+1]=0.0;
        normals[idx*3+2]=1.0;
    }
    waterfacepositionbuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacepositionbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);

    waterfacenormalbuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacenormalbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);


    var indices = new Uint16Array((w-1)*(h-1)*6);
    var cursquare=0;
    for(var i=0;i<w-1;i++) for(var j=0;j<h-1;j++)
    {
        indices[cursquare*6]=translateGridCoord(i,j,w);
        indices[cursquare*6+1]=translateGridCoord(i,j+1,w);
        indices[cursquare*6+2]=translateGridCoord(i+1,j+1,w);
        indices[cursquare*6+3]=translateGridCoord(i+1,j+1,w);
        indices[cursquare*6+4]=translateGridCoord(i+1,j,w);
        indices[cursquare*6+5]=translateGridCoord(i,j,w);
        cursquare++;
    }

    waterfaceindicesbuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,waterfaceindicesbuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW)
    waterfaceindicesbuffer.numitems=cursquare*6;
}

function initQuad()
{
    ///////////////////////////////
    /// Initialize the quad, using Triangle_Strip to draw it!
    /// positions are -1,-1; -1,1; 1,1; 1,-1
    /// And indices are 0,1,2,0,2,3
    ///////////////////////////////
    simpositionbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, simpositionbuffer);
    var quadpos=[-1.0,-1.0,
        -1.0,1.0,
        1.0,1.0,
        1.0,-1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadpos), gl.STATIC_DRAW );
    simindicesbuffer= gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simindicesbuffer);
    var quadidx=[0,1,2,0,2,3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadidx), gl.STATIC_DRAW);
}

var cubeTexture;
var cubeImage;


function initHeightField(w,h)
{
    heightfield=new Array(w);
    velfield=new Array(w);

    for(var i=0;i<w;i++)
    {
        heightfield[i]=new Array(h);
        velfield[i]=new Array(h);
        for(var j=0;j<h;j++)
        {
            heightfield[i][j]=0.0;
            velfield[i][j]=0.0;
        }
    }

    for(var stepsize=w;stepsize>=1.0;stepsize/=8.0)
    {

        for(var i=0;i<w;i+=stepsize)
        {
            for(var j=0;j<h;j+=stepsize)
            {
                var temp=Math.random()*Math.pow(stepsize/w,1.0)/2.0;
                    for(var x=i;x<i+stepsize;x++)for(var y=j;y<j+stepsize;y++)
                {
                    var c1=Math.cos((x-i-stepsize*0.5)/stepsize*(Math.PI));
                    var c2=Math.cos((y-j-stepsize*0.5)/stepsize*(Math.PI));
                    heightfield[x][y]+=c1*c2*temp;
                }
            }
        }
    }
}

function initTextures() {
    cubeTexture = gl.createTexture();
    cubeImage = new Image();
    cubeImage.onload = function() { handleTextureLoaded(cubeImage, cubeTexture); }
    cubeImage.src = "earthmap50.png";
}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function firstpass()
{
    //THIS IS THE FIRST PATH THAT USE GLSL TO COMPUTE THE HEIGHT FIELD TO THE rttTexture BUFFER
    gl.useProgram(simulateProgram);
    gl.uniform1f(sim_utimeloc, curtime);
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, simpositionbuffer);
    gl.vertexAttribPointer(simulateProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(simulateProgram.samplerUniform, 0);





    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simindicesbuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

}

function secondpass()
{

    // This is the 2nd path that copy the rendered result to the height-map, which can be used in the first step.

    gl.useProgram(copyProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER,copyFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, copyFramebuffer.width, copyFramebuffer.height);
    gl.uniform1f(copy_utimeloc, curtime);
    gl.bindBuffer(gl.ARRAY_BUFFER, simpositionbuffer);
    gl.vertexAttribPointer(copyProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.uniform1i(copyProgram.samplerUniform, 1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simindicesbuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function updateNormal(index, newnormal)
{
    normals[index*3]=newnormal.x;
    normals[index*3+1]=newnormal.y;
    normals[index*3+2]=newnormal.z;
}

function updateNormalMap(w,h)
{
    for(var i=0;i<w;i++) for(var j=0;j<h;j++)
    {
        var useleft=true;
        var useright=true;
        var useup=true;
        var usedown=true;
        var left = i-1; if(left<0) useleft=false;
        var right = i+1; if(right>=w) useright=false;
        var up = j-1; if(up<0) useup=false;
        var down = j+1; if(down>=h) usedown=false;

        var count=0;
        var leftcoord;
        var leftPos=new Vec3(0,0,0);
        var rightcoord,rightPos=new Vec3(0,0,0),upcoord,upPos=new Vec3(0,0,0),downcoord,downPos=new Vec3(0,0,0);
        if(useleft)
        {
            leftcoord=translateGridCoord(left,j,w);
            leftPos=new Vec3(positions_World[leftcoord*3],positions_World[leftcoord*3+1],positions_World[leftcoord*3+2]);
        }
        if(useright)
        {
            rightcoord=translateGridCoord(right,j,w);
            rightPos=new Vec3(positions_World[rightcoord*3],positions_World[rightcoord*3+1],positions_World[rightcoord*3+2]);
        }
        if(useup)
        {
            upcoord=translateGridCoord(i,up,w);
            upPos=new Vec3(positions_World[upcoord*3],positions_World[upcoord*3+1],positions_World[upcoord*3+2]);
        }
        if(usedown)
        {
            downcoord=translateGridCoord(i,down,w);
            downPos=new Vec3(positions_World[downcoord*3],positions_World[downcoord*3+1],positions_World[downcoord*3+2]);
        }

        var mycoord = translateGridCoord(i,j,w);
        var myPos=new Vec3(positions_World[mycoord*3],positions_World[mycoord*3+1],positions_World[mycoord*3+2]);
        var totalNormal=new Vec3(0,0,0);

        if(useleft&&useup)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,leftPos),vecMinus(upPos,myPos))));
        }
        if(useright&&useup)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,upPos),vecMinus(rightPos,myPos))));
        }
        if(usedown&&useright)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,rightPos),vecMinus(downPos,myPos))));
        }
        if(usedown&&useleft)
        {
            totalNormal=vecAdd(totalNormal,vecNormalize(vecCross(vecMinus(myPos,downPos),vecMinus(leftPos,myPos))));
        }
        totalNormal=vecNormalize(totalNormal);
        updateNormal(mycoord,totalNormal);
    }
}

function finalrender()
{
    //This is the 3rd path that use GLSL to render the image, using rttTexture to be the height field of the wave
    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvaswidth,canvasheight);

    debugarea.innerHTML=canvaswidth+"  "+canvasheight;
    //gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, copyTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 2);


    var mv = mat4.create();
    mat4.multiply(view, model, mv);
    var mvp = mat4.create();
    mat4.multiply(persp, mv, mvp);
    var mvpit=mat4.create();
    mvpit=mat4.inverse(mvp,mvpit);
    mvpit=mat4.transpose(mvpit,mvpit);



    gl.uniform3f(gl.getUniformLocation(shaderProgram, "eyePos"),  eye[0],eye[1],eye[2]);

    gl.uniform1f(shader_utimeloc, curtime);
    gl.uniformMatrix4fv(u_modelViewPerspectiveLocation, false, mvp);
    gl.uniformMatrix4fv(u_modelViewPerspectiveLocation_Inverse_Transpose, false, mvpit);
    gl.uniformMatrix4fv(u_modelLocation, false, model);

    //shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "normal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, waterfacepositionbuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);


    gl.bindBuffer(gl.ARRAY_BUFFER, waterfacenormalbuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, waterfaceindicesbuffer);
    gl.drawElements(gl.TRIANGLES, waterfaceindicesbuffer.numitems, gl.UNSIGNED_SHORT,0);
    
    
}
function animate()
{
 //   firstpass();
 //   secondpass();

    simulateHeightField(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);

    drawSkybox();
    finalrender();

    var nowtime=new Date().getTime();
    if(nowtime-1000>starttime)
    {
        document.title = "WebGL Water Shader ["+new Number(totalframes*1000/(new Date().getTime()-starttime)).toPrecision(3)+"fps]";
        starttime=nowtime;
        totalframes=0;
    }
}

function tick(){
    requestAnimFrame(tick);
    curtime=curtime+0.01;
    totalframes++;
    if(totalframes%2==0)
        animate();
}

function updateWorldPositions(w , h)
{
    for(var i=0;i<w;i++)
    {
        for(var j=0;j<h;j++)
        {
            var mycoord = translateGridCoord(i,j,w);
            var worldPos=vec4.create();
            mat4.multiplyVec4(model,[positions[mycoord*3],positions[mycoord*3+1],positions[mycoord*3+2],1.0],worldPos);
            positions_World[mycoord*3]=worldPos[0];
            positions_World[mycoord*3+1]=worldPos[1];
            positions_World[mycoord*3+2]=worldPos[2];
        }
    }
}
function simulateHeightField(w,h)
{
    for(var i=0;i<w;i++)
    {
        for(var j=0;j<h;j++)
        {
            var left = i-1; if(left<0) left+=1;
            var right = i+1; if(right>=w) right-=1;
            var up = j-1; if(up<0) up+=1;
            var down = j+1; if(down>=h) down-=1;

            velfield[i][j]+=(heightfield[left][j]+
                heightfield[right][j]+
                heightfield[i][up]+
                heightfield[i][down])*0.25-heightfield[i][j];

            velfield[i][j]*=0.9999;
        }
    }
    for(var i=0;i<w;i++)
    {
        for(var j=0;j<h;j++)
        {
            heightfield[i][j]+=velfield[i][j];
            var idx=translateGridCoord(i,j,w);

            ///Y is up
            positions[idx*3+1]=heightfield[i][j];
            //positions[idx*3+2]=0.0;
        }
    }


    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacepositionbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);


    mat4.identity(model);
    mat4.scale(model, [120.0, 15.0, 120.0]);
    mat4.translate(model, [-0.5, -0.0, -0.5]);



    updateWorldPositions(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);
    updateNormalMap(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);
    gl.bindBuffer(gl.ARRAY_BUFFER,waterfacenormalbuffer);
    gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);
}


var cubemapimages;

function webGLStart() {
    starttime=new Date().getTime();
    totalframes = 0;
    var canvas = document.getElementById("canvas1");
    debugarea  = document.getElementById("debug_text");
    initGL(canvas);

    canvas.onmousedown = handleMouseDown;
    canvas.oncontextmenu = function (ev) { return false; };
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    persp = mat4.create();
    mat4.perspective(45.0, canvas.width / canvas.height, 0.1, 200.0, persp);
    
    eye = sphericalToCartesian(radius, azimuth, zenith);   
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    model = mat4.create();

    gl.getExtension('OES_texture_float');

    initHeightField(NUM_WIDTH_PTS,NUM_HEIGHT_PTS);

    initSimShader();
    initCopyShader();
    initRenderShader();
    initSkyboxShader();
    initTextureFramebuffer();
    initCopyTextureFramebuffer();
    initQuad();
    initGrid();
    intializeSkybox();
    initSkyboxTex();
//    initCubeMap();
    //initTextures();

    gl.viewport(0,0,canvaswidth,canvasheight);

    gl.clearColor(0.0,0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    tick();
}
