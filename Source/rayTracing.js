// Modified from hatImage1.js in Chapter 7
"use strict";

var imageSize = 512;

// Create image data
// Here i used Uint8ClampedArray instead of Uint8Array so that it is clamped.
// * 3 is for dimension
var image = new Uint8ClampedArray(imageSize * imageSize * 3);

// Texture coords for quad
var canvas;
var gl;

var program;

var texture;


class IsectInfo {

	constructor(tNear, hitObjectIndex) {
		this.tNear = tNear;
		this.hitObjectIndex = hitObjectIndex;
	}

}

class SphericalLight {

	constructor(color, intensity, pos) {
		this.pos = pos;
		this.intensity = intensity;
		this.color = color;
	}

	getDirection(p) {

		var lightDir = subtract(this.pos, p);

		var r2 = (lightDir[0] * lightDir[0]) + (lightDir[1] * lightDir[1]) + (lightDir[2] * lightDir[2]);
		
		var distance = Math.sqrt(r2);
		lightDir = normalize(lightDir);
		var lightIntesity = vec4(0,0,0,1);
		lightIntesity[0] = this.intensity  * this.color[0] / (4 * Math.PI * r2); 
		lightIntesity[1] = this.intensity  * this.color[1] / (4 * Math.PI * r2);
		lightIntesity[2] = this.intensity  * this.color[2] / (4 * Math.PI * r2);

		return [lightDir, lightIntesity, distance];
	}
}

class Light 
{ 
	constructor(color, intensity, location, dir) {
		this.color = color
	    this.intensity = intensity; 
	    this.location = location;
	    this.dir = normalize(dir);	
	}
	
}; 

class Cube {
	constructor(leftUpCorner, length, color, type, material_type) {

		this.a1 = leftUpCorner;
		this.a2 = vec3(this.a1[0] + length, this.a1[1], this.a1[2]);
		this.a3 = vec3(this.a1[0] + length, this.a1[1] - length, this.a1[2]);
		this.a4 = vec3(this.a1[0], this.a1[1]-length, this.a1[2]);
		this.a5 = vec3(this.a1[0], this.a1[1], this.a1[2] - length);
		this.a6 = vec3(this.a5[0] + length, this.a5[1], this.a5[2]);
		this.a7 = vec3(this.a5[0] + length, this.a5[1] - length, this.a5[2]);
		this.a8 = vec3(this.a5[0], this.a5[1]-length, this.a5[2]);
		this.length = length
		this.albedoVec = color;
		this.type = type;
		this.material_type = material_type;

		objects.push(new Triangle(this.a3, this.a2, this.a1, this.albedoVec, false, this.type, this.material_type));
		objects.push(new Triangle(this.a1, this.a4, this.a3, this.albedoVec, false, this.type, this.material_type)); // front face

		objects.push(new Triangle(this.a2, this.a6, this.a5, this.albedoVec, false, this.type, this.material_type)); 
		objects.push(new Triangle(this.a5, this.a1, this.a2, this.albedoVec, false, this.type, this.material_type)); // upper face
		

		objects.push(new Triangle(this.a3, this.a6, this.a2, this.albedoVec, false, this.type, this.material_type));
		objects.push(new Triangle(this.a3, this.a7, this.a6, this.albedoVec, false, this.type, this.material_type));

		objects.push(new Triangle(this.a1, this.a5, this.a8, this.albedoVec, false, this.type, this.material_type));
		objects.push(new Triangle(this.a1, this.a8, this.a4, this.albedoVec, false, this.type, this.material_type));

		objects.push(new Triangle(this.a6, this.a7, this.a8, this.albedoVec, false, this.type, this.material_type));
		objects.push(new Triangle(this.a8, this.a5, this.a6, this.albedoVec, false, this.type, this.material_type));
		objects.push(new Triangle(this.a4, this.a8, this.a7, this.albedoVec, false, this.type, this.material_type));
		objects.push(new Triangle(this.a4, this.a7, this.a3, this.albedoVec, false, this.type, this.material_type));
	}
}

class Cone2 {

	constructor(radius, height, center, color, type, material_type, indexOfRefraction) {
		this.radius = radius;	// radius
		this.height = height;	// height
		this.center = center;	// center
		this.color = color;
		this.albedoVec = color;
		this.type = type;
		if (material_type == "shiny") {
			this.Kd = 1;
			this.Ks = 0.15;
			this.n = 40;
		} else if (material_type == "transparent") {
			this.indexOfRefraction = indexOfRefraction;
		} else {
			this.Kd = 1;
			this.Ks = 0.01;
			this.n = 5;
		}
	}

	getSurfaceData(phit) {
		var nhit = vec3(0, 0, 0);
		var V = vec3(0, 0, 0);

		V[0] = phit[0] - this.center[0];
		V[1] = 0;
		V[2] = phit[2] - this.center[2];

		V = normalize(V);

		nhit[0] = V[0] * this.height / this.radius;
		nhit[1] = this.radius / this.height;
		nhit[2] = V[2] * this.height / this.radius;

		nhit = normalize(nhit);

		var tex = vec2(0, 0);
		tex[0] = (1 + Math.atan2(nhit[2], nhit[0]) / Math.PI) * 0.5;
		tex[1] = Math.acos(nhit[1]) / Math.PI;

		return [nhit, tex];
	}

	computeIntersection(orig, dir) {
		var rOverh2 = Math.pow((this.radius / this.height), 2);

		var a = dir[0] * dir[0] + dir[2] * dir[2] - rOverh2 * dir[1] * dir[1];

		var b = 2 * dir[0] * (orig[0] - this.center[0])
			+ 2 * dir[2] * (orig[2] - this.center[2])
			+ 2 * rOverh2 * dir[1] * (this.height + this.center[1] - orig[1]);

		var c = Math.pow(orig[0] - this.center[0], 2)
			+ Math.pow(orig[2] - this.center[2], 2)
			- rOverh2 * Math.pow(this.height + this.center[1] - orig[1], 2);

		var discriminant = Math.sqrt(b * b - 4.0 * a * c);

		if (discriminant < 0.001 || discriminant < 0.0) return -1.0;

		var t1 = (-b - discriminant) / (2.0 * a);
		var t2 = (-b + discriminant) / (2.0 * a);

		if (Math.abs(t1) < 0.001) {
			if (t2 > 0) return t2;
			else t1 = -1.0;
		}
		if (Math.abs(t1) < 0.001) t2 = -1.0;

		var closet = Math.min(t1, t2);
		var furest = Math.max(t1, t2);
		var y1 = (orig[1] + closet * dir[1]) - this.center[1];
		var y2 = (orig[1] + furest * dir[1]) - this.center[1];
		if (!(y1 < 0 || y1 > this.height) && closet != -1.0) return closet;
		if (!(y2 < 0 || y2 > this.height) && furest != -1.0) return furest;

		return -1.0;
	}
}

class Sphere {

	constructor(radius, center, color, type, material_type, indexOfRefraction) {
		this.radius = radius;
		this.radius2 = radius * radius;
		this.center = center;
		this.color = color;
		this.albedo = 0.18;
		this.albedoVec = divide4VecCons(color, 4);
		this.type = type;
		if (material_type == "shiny") {
			this.Kd = 1;
			this.Ks = 0.15;
			this.n = 40;
		} else if (material_type == "transparent") {
			this.indexOfRefraction = indexOfRefraction;
		} else {
			this.Kd = 1;
			this.Ks = 0.01;
			this.n = 5;
		}
		
		
	}

	getSurfaceData(phit) 
	{ 
	    var nhit = subtract(phit, this.center); 
	    nhit = normalize(nhit);

	    var tex = vec2(0,0);
	    tex[0] = (1 + Math.atan2(nhit[2], nhit[0]) / Math.PI) * 0.5; 
	    tex[1] = Math.acos(nhit[1]) / Math.PI; 
	    return [nhit, tex];
	} 

	computeIntersection(orig, dir) {

		var t0, t1;
		var L = subtract(orig, this.center);  
	    var a = dot(dir, dir); 
	    var b = 2 * dot(dir,L); 
	    var c = dot(L, L) - (this.radius2); 

	    var discr = b * b - 4 * a * c; 
	    if (discr < 0) 
	    	return -1; 
	    else if (discr == 0) 
	    	t0 = t1 = - 0.5 * b / a; 
	    else { 
	        var q = (b > 0) ? -0.5 * (b + Math.sqrt(discr)) : -0.5 * (b - Math.sqrt(discr)); 
	        t0 = q / a; 
	        t1 = c / q; 
	    } 

	    if (t0 > t1){
	    	var temp = t0;
	    	t0 = t1;
	    	t1 = temp;
	    }

	    if (t0 < 0) { 
	        t0 = t1; // if t0 is negative, let's use t1 instead 
	        if (t0 < 0) return -1; // both t0 and t1 are negative 
	    } 
		return t0;
	}

}

class Triangle {

	constructor(a, b, c, color, isSingleSided, type, material_type, indexOfRefraction) {
		this.a = vec3(a);
		this.b = vec3(b);
		this.c = vec3(c);
		this.normal;
		this.notNormalizedNormal;
		this.albedoVec = color;
		this.isSingleSided = isSingleSided;
		this.u = 0;
		this.v = 0;
		this.type = type;
		if (material_type == "shiny") {
			this.Kd = 1;
			this.Ks = 0.40;
			this.n = 10;
		} else if (material_type == "transparent") {
			this.indexOfRefraction = indexOfRefraction;
        } else {
			this.Kd = 0.99;
			this.Ks = 0.0;
			this.n = 2;
		}
		
	}

	findNormal() {
		var edge1 = subtract(this.b, this.a);
		var edge2 = subtract(this.c, this.a);

		var normal = cross(edge1, edge2);
		this.notNormalizedNormal = normal;
		this.normal = normalize(normal);
		return this.normal;
	}

	getSurfaceData(phit) 
	{ 
		var nhit = this.normal;
		var tex = vec2(0,0);
	    tex[0] = (1 + Math.atan2(nhit[2], nhit[0]) / Math.PI) * 0.5; 
	    tex[1] = Math.acos(nhit[1]) / Math.PI;
		return [this.normal, tex];
	} 

	computeIntersection(orig, dir) 
	{

		var kEpsilon = 0.00001;

		var edge1 = subtract(this.b, this.a);
		var edge2 = subtract(this.c, this.a);

		var pvec = cross(dir, edge2);
		var det = dot(edge1, pvec);

		if (det < kEpsilon) {
			return -1;
		}

		var u;
		var v;
		var t;
		var invDet = 1 / det;

		var tvec = subtract(orig, this.a);

		u = dot(tvec, pvec) * invDet;

		if (u < 0 || u > 1)
			return -1;

		var qvec = cross(tvec, edge1);
		v = dot(dir, qvec) * invDet;
		if (v < 0 || u + v > 1) 
			return -1;

		t = dot(edge2, qvec) * invDet;

		this.u = u;
		this.v = v;

    	return t;
	}
}
 
// at least 1 object
var objects = [];
var lights = [];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var pointsArray = [];
    var texCoordsArray = [];

	// create room 

	createRoom();


	var cube = new Cube(vec3(-11,-9,-14), 6, vec4(0,1,0,1), "kReflection", "opaque");

	var sphere = new Sphere(2, vec3(-1, 7, -15), vec4(0, 0, 1, 1), "kPhong", "opaque");
	objects.push(sphere);
	
	var sphere = new Sphere(2, vec3(2, 7, -15), vec4(1,0,0, 1), "kPhong", "shiny");
    objects.push(sphere); 

    var sphere = new Sphere(4, vec3(-9, -5, -25), vec4(1,1,1,1), "kReflection", "opaque");
	objects.push(sphere);


	//constructor(radius, height, center, color, type, material_type) {

	var cone = new Cone2(2, 5, vec3(1.5, -5, -12), vec4(1, 0, 0, 1), "kPhong", "opaque", 1);
	objects.push(cone);

	var cone = new Cone2(2, 5, vec3(10, -10, -15), vec4(1, 1, 1, 1), "kPhong", "opaque", 1);
	objects.push(cone);

	var sphere = new Sphere(2, vec3(2, 0, -10), vec4(1, 1, 1, 1), "kReflectionAndRefraction", "transparent", 1.2);
	objects.push(sphere);

    var light = new SphericalLight(vec4(1,1,1,1), 15000, vec3(12, 10, 0));
    
    lights.push(light);

    // Use a quad to render texture 
    pointsArray.push(vec2(-1, -1));
    pointsArray.push(vec2(-1, 1));
    pointsArray.push(vec2(1, 1));
    pointsArray.push(vec2(1, -1));

    texCoordsArray.push(vec2(0, 0));
    texCoordsArray.push(vec2(0, 1));
    texCoordsArray.push(vec2(1, 1));
    texCoordsArray.push(vec2(1, 0));

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( vPosition);

    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Set up texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

    render();
}

function render() {

    tracer();
    
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.bindTexture( gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,    // target
        0,                // level
        gl.RGB,           // image format 
        imageSize,        // width
        imageSize,        // height
        0,                // Border
        gl.RGB,           // Format
        gl.UNSIGNED_BYTE, // type
        image             // Data source
    );

    gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );

    requestAnimationFrame(render);
}


// Ray tracing function
var max_depth = 4;

function tracer()
{
	var depth = 1;
	var imageWidth = imageSize;
	var imageHeight = imageSize;
	var imageAspectRatio = imageWidth / imageHeight; // assuming width > height
    var rayOrigin;
    var rayDirection;
    var scale = Math.tan(radians(100 * 0.5));

    for (var y = 0; y < imageHeight; ++y)
    {
        for (var x = 0; x < imageWidth; ++x)
        {
            // Trace Here
            // compute primary ray direction
			var Px = (2 * ((x + 0.5) / imageWidth) - 1) * imageAspectRatio * scale; // * tan(fov / 2 * M_PI / 180) for scaling image  
			var Py = (1 - 2 * ((y + 0.5) / imageHeight)) * scale; 

			rayOrigin = vec3(0.0, 0.0, 0.0);
			rayDirection = vec3(Px - rayOrigin[0], Py - rayOrigin[1], -1 - rayOrigin[2]); // note that this just equal to Vec3f(Px, Py, -1); 
			rayDirection = normalize(rayDirection); // it's a direction so don't forget to normalize

			// cast prim ray here
			// we need origin, direction, object, light 
			var pix_color = castRay(rayOrigin, rayDirection, depth);

            // Set color values
        	image[(y * imageSize + x) * 3 + 0] = 255 * pix_color[0];
            image[(y * imageSize + x) * 3 + 1] = 255 * pix_color[1];
            image[(y * imageSize + x) * 3 + 2] = 255 * pix_color[2];
        }
    }
}
var Ka = 0.4;
function castRay(orig, dir, depth) {

	var bias = 0.00001;

	var tNear;
	var pHit;
	var nHit;
	var tex;
	var hitColor = vec4(0,0,0, 1);
	var hitObjectIndex = -1;
	

	if (!(depth < max_depth))
		return hitColor;

	[tNear, hitObjectIndex] = trace(orig, dir, Infinity, 0)

	var isect = new IsectInfo(tNear, hitObjectIndex)

	if (isect.tNear != Infinity && isect.hitObjectIndex != -1) {

		pHit = add(orig, vec3(dir[0]*isect.tNear, dir[1]*isect.tNear, dir[2]*isect.tNear)); //hit point
		
		[nHit, tex] = objects[isect.hitObjectIndex].getSurfaceData(pHit);
	    
		var R;

		if (objects[isect.hitObjectIndex].type == "kReflectionAndRefraction")
		{
			var refractionColor = vec3(0, 0, 0);
			// compute fresnel
			var kr = fresnel(dir, nHit, objects[isect.hitObjectIndex].indexOfRefraction);
			
			var outside = dot(dir, nHit) < 0;

			// compute refraction if it is not a case of total internal reflection
			if (kr < 1) {
				var refractionDirection = normalize(refract(dir, nHit, objects[isect.hitObjectIndex].indexOfRefraction));
				var refractionRayOrig = outside ? subtract(pHit, multiply3VecCons(nHit, bias)) : add(pHit, multiply3VecCons(nHit, bias));
				refractionColor = castRay(refractionRayOrig, refractionDirection, depth + 1);
			}
			var reflectionDirection = normalize(reflect(dir, nHit));
			var reflectionRayOrig = outside ? subtract(pHit, multiply3VecCons(nHit, bias)) : add(pHit, multiply3VecCons(nHit, bias));
			var reflectionColor = castRay(reflectionRayOrig, reflectionDirection, depth + 1);

			// mix the two
			hitColor = add(hitColor, add(multiply4VecCons(reflectionColor, kr), multiply4VecCons(refractionColor, (1 - kr))));
		} 

		else if (objects[isect.hitObjectIndex].type == "kReflection") 
        { 
            R = reflect(dir, nHit); 
            R = normalize(R);
            var mix_param = 0.3;
            if (objects[isect.hitObjectIndex].material_type == "shiny") {
            	mix_param = 0.9;
            }

            hitColor = add(hitColor, multiply4VecCons(castRay(add(pHit, multiply3VecCons(nHit,bias)), R, depth + 1), mix_param)); 

            var ambient = vec3(0,0,0);
        	var specular = vec3(0, 0, 0);
        	var diffuse = vec3(0, 0, 0);
        	var L,intensity,distance;
		 	[L, intensity, distance] = lights[0].getDirection(pHit); //change for multiple light

	        // compute color of diffuse surface illuminated
	        // by a single distant light source.
	        var isectShad = new IsectInfo(-1,-1);
			
	        [isectShad.tNear, isectShad.hitObjectIndex] = trace(add(pHit, multiply3VecCons(nHit,bias)), L, distance, 1); 
	        var vis = 1;
	        if (isectShad.tNear != Infinity) {
	        	vis = 0;
	        }

	        diffuse[0] += vis * (objects[isect.hitObjectIndex].albedoVec[0] / Math.PI) * intensity[0] * Math.max(0.0, dot(nHit, L)); 
 			diffuse[1] += vis * (objects[isect.hitObjectIndex].albedoVec[1] / Math.PI) * intensity[1] * Math.max(0.0, dot(nHit, L));
 			diffuse[2] += vis * (objects[isect.hitObjectIndex].albedoVec[2] / Math.PI) * intensity[2] * Math.max(0.0, dot(nHit, L));
			
            // compute the specular component
            // what would be the ideal reflection direction for this light ray
            var R = reflect(L, nHit); 

            specular[0] += vis * intensity[0] * Math.pow(Math.max(0.0, dot(R, dir)), objects[isect.hitObjectIndex].n); 
            specular[1] += vis * intensity[1] * Math.pow(Math.max(0.0, dot(R, dir)), objects[isect.hitObjectIndex].n);
            specular[2] += vis * intensity[2] * Math.pow(Math.max(0.0, dot(R, dir)), objects[isect.hitObjectIndex].n);

            ambient[0] += (objects[isect.hitObjectIndex].albedoVec[0] / Math.PI) * (intensity[0])// * Math.max(0.0, dot(R, dir));
            ambient[1] += (objects[isect.hitObjectIndex].albedoVec[1] / Math.PI) * (intensity[1])// * Math.max(0.0, dot(R, dir));
            ambient[2] += (objects[isect.hitObjectIndex].albedoVec[2] / Math.PI) * (intensity[2])// * Math.max(0.0, dot(R, dir));

            hitColor[0] += diffuse[0] * objects[isect.hitObjectIndex].Kd + specular[0] * objects[isect.hitObjectIndex].Ks + ambient[0] * Ka;
            hitColor[1] += diffuse[1] * objects[isect.hitObjectIndex].Kd + specular[1] * objects[isect.hitObjectIndex].Ks + ambient[1] * Ka;
            hitColor[2] += diffuse[2] * objects[isect.hitObjectIndex].Kd + specular[2] * objects[isect.hitObjectIndex].Ks + ambient[2] * Ka;
			hitColor[3] = 1;

            //var scale = 4; 
		    //var pattern = (((tex[0] * scale) % 1.0) > 0.5) ^ (((tex[1] * scale) % 1.0) > 0.5);
		 	//var L = vec3(-1*lights[0].dir[0], -1*lights[0].dir[1], -1*lights[0].dir[2]);  // change if you use multiple light
        } 
        else if (objects[isect.hitObjectIndex].type == "kPhong") 
        {
        	var ambient = vec3(0,0,0);
        	var specular = vec3(0, 0, 0);
        	var diffuse = vec3(0, 0, 0);
        	var L,intensity,distance;
		 	[L, intensity, distance] = lights[0].getDirection(pHit); //change for multiple light

	        // compute color of diffuse surface illuminated
	        // by a single distant light source.
	        var isectShad = new IsectInfo(-1,-1);
			
	        [isectShad.tNear, isectShad.hitObjectIndex] = trace(add(pHit, multiply3VecCons(nHit,bias)), L, distance, 1); 
	        var vis = 1;
	        if (isectShad.tNear != Infinity) {
	        	vis = 0;
	        }

	        diffuse[0] += vis * (objects[isect.hitObjectIndex].albedoVec[0] / Math.PI) * intensity[0] * Math.max(0.0, dot(nHit, L)); 
 			diffuse[1] += vis * (objects[isect.hitObjectIndex].albedoVec[1] / Math.PI) * intensity[1] * Math.max(0.0, dot(nHit, L));
 			diffuse[2] += vis * (objects[isect.hitObjectIndex].albedoVec[2] / Math.PI) * intensity[2] * Math.max(0.0, dot(nHit, L));
			
            // compute the specular component
            // what would be the ideal reflection direction for this light ray
            var R = reflect(L, nHit); 

            specular[0] += vis * intensity[0] * Math.pow(Math.max(0.0, dot(R, dir)), objects[isect.hitObjectIndex].n); 
            specular[1] += vis * intensity[1] * Math.pow(Math.max(0.0, dot(R, dir)), objects[isect.hitObjectIndex].n);
            specular[2] += vis * intensity[2] * Math.pow(Math.max(0.0, dot(R, dir)), objects[isect.hitObjectIndex].n);

            ambient[0] += (objects[isect.hitObjectIndex].albedoVec[0] / Math.PI) * (intensity[0])// * Math.max(0.0, dot(R, dir));
            ambient[1] += (objects[isect.hitObjectIndex].albedoVec[1] / Math.PI) * (intensity[1])// * Math.max(0.0, dot(R, dir));
            ambient[2] += (objects[isect.hitObjectIndex].albedoVec[2] / Math.PI) * (intensity[2])// * Math.max(0.0, dot(R, dir));

            hitColor[0] += diffuse[0] * objects[isect.hitObjectIndex].Kd + specular[0] * objects[isect.hitObjectIndex].Ks + ambient[0] * Ka;
            hitColor[1] += diffuse[1] * objects[isect.hitObjectIndex].Kd + specular[1] * objects[isect.hitObjectIndex].Ks + ambient[1] * Ka;
            hitColor[2] += diffuse[2] * objects[isect.hitObjectIndex].Kd + specular[2] * objects[isect.hitObjectIndex].Ks + ambient[2] * Ka;
			hitColor[3] = 1;
        }
        else if (objects[isect.hitObjectIndex].type == "mirror") {
        	R = reflect(dir, nHit); 
            R = normalize(R);

            hitColor = add(hitColor, multiply4VecCons(castRay(add(pHit, multiply3VecCons(nHit,bias)), R, depth + 1), 1)); 
        }
        else 
		{
        	var L,intensity,distance;
		 	[L, intensity, distance] = lights[0].getDirection(pHit); //change for multiple light

	        // compute color of diffuse surface illuminated
	        // by a single distant light source.
	        var isectShad = new IsectInfo(-1,-1);
	        
	        [isectShad.tNear, isectShad.hitObjectIndex] = trace(add(pHit, multiply3VecCons(nHit,bias)), L, distance, 1); 
	        var vis = 1;
	        if (isectShad.tNear != Infinity) {
	        	vis = 0;
	        }

			hitColor[0] = hitColor[0] + (vis  * (Math.max(0.0, dot(nHit, L)) * intensity[0] * (objects[isect.hitObjectIndex].albedoVec[0] / Math.PI)));
			hitColor[1] = hitColor[1] + (vis  * (Math.max(0.0, dot(nHit, L)) * intensity[1] * (objects[isect.hitObjectIndex].albedoVec[1] / Math.PI)));
			hitColor[2] = hitColor[2] + (vis  * (Math.max(0.0, dot(nHit, L)) * intensity[2] * (objects[isect.hitObjectIndex].albedoVec[2] / Math.PI)));
			hitColor[3] = 1;
        }

		//hitColor =  mix(objects[hitObjectIndex].color, mult(objects[hitObjectIndex].color, vec4(0.5, 0.5, 0.5, 1)), pattern);
		//hitColor = mix ( hitColor, multiply4VecCons(lights[0].color, (Math.max(0.0, dot(nHit, L)) * lights[0].intensity * (objects[hitObjectIndex].albedo / Math.PI))), 0.8);
		//hitColor =  mix(hitColor, mult(hitColor, vec4(0.5, 0.5, 0.5, 1)), pattern);
	}

    return hitColor; 
}

function trace(orig, dir, distance, flag) {

	var tNear = Infinity;
	var hitObjectIndex = -1;
	var temp_t0 = -1;
	var u = -1;
	var v = -1;
	for (var i = 0; i < objects.length; i++) {

		if (objects[i] instanceof Sphere)
			temp_t0 = objects[i].computeIntersection(orig, dir);

		else if (objects[i] instanceof Triangle) {
			objects[i].findNormal();
			temp_t0 = objects[i].computeIntersection(orig, dir);
		} else {
			temp_t0 = objects[i].computeIntersection(orig, dir);
        }

		if (temp_t0 > 0 && temp_t0 < tNear && temp_t0 < distance) {
			hitObjectIndex = i;
			tNear = temp_t0;
		}
	}
	return [tNear, hitObjectIndex];
}

function fresnel(dir, normal, indexOfRefraction)
{
	var cosi = dot(dir, normal);
	cosi = Math.max(-1.0, cosi);
	cosi = Math.min(1.0, cosi);
	var etai = 1.0;
	var etat = indexOfRefraction;
	if (cosi > 0.0) {
		var temp = etai;
		etai = etat;
		etat = temp;
	}
	// Compute sini using Snell's law
	var sint = etai / etat * Math.sqrt(Math.max(0.0, 1.0 - cosi * cosi));

	// Total internal reflection
	var kr;
	if (sint >= 1.0) {
		kr = 1.0;
	}
	else {
		var cost = Math.sqrt(Math.max(0.0, 1.0 - sint * sint));
		cosi = Math.abs(cosi);
		var Rs = ((etat * cosi) - (etai * cost)) / ((etat * cosi) + (etai * cost));
		var Rp = ((etai * cosi) - (etat * cost)) / ((etai * cosi) + (etat * cost));
		kr = (Rs * Rs + Rp * Rp) / 2;
	}
	// As a consequence of the conservation of energy, transmittance is given by:
	return kr;
} 

function refract(dir, normal, indexOfRefraction)
{
	var cosi = dot(dir, normal);
	cosi = Math.max(-1.0, cosi);
	cosi = Math.min(1.0, cosi);
	var etai = 1.0;
	var etat = indexOfRefraction;
	var n = normal;
	if (cosi < 0) {
		cosi = -cosi;
	} else {
		var temp = etai;
		etai = etat;
		etat = temp;
		n = vec3(-normal[0], -normal[1], -normal[2]);
	}
	var eta = etai / etat;
	var k = 1 - eta * eta * (1 - cosi * cosi);

	return k < 0 ?
		vec3(0, 0, 0) :
		vec3(eta * dir[0] + (eta * cosi - Math.sqrt(k)) * n[0],
			 eta * dir[1] + (eta * cosi - Math.sqrt(k)) * n[1],
			 eta * dir[2] + (eta * cosi - Math.sqrt(k)) * n[2]);
} 

function createRoom() {

	var pos1 = 15;
	var pos2 = - pos1;
	var pos3 = -30;
	var pos4 = 30;

	var a = vec3(pos1, pos1, pos4);
    var b = vec3(pos1, pos2, pos4);
    var c = vec3(pos1, pos2, pos3);
    var d = vec3(pos1, pos1, pos3); // right wall

    var triangle1_1 = new Triangle(c, b, a, vec4(1,1,0), false, "kPhong", "opaque");
    var triangle1_2 = new Triangle(a, d, c, vec4(1,1,0), false, "kPhong", "opaque");

    objects.push(triangle1_1);
    objects.push(triangle1_2); 

    a = vec3(pos2, pos1, pos4);
    b = vec3(pos2, pos2, pos4);
    c = vec3(pos2, pos2, pos3);
    d = vec3(pos2, pos1, pos3); // left wall

    var triangle1_1 = new Triangle(a, b, c, vec4(1,0,1), false, "kPhong", "opaque"); 
    var triangle1_2 = new Triangle(c, d, a, vec4(1,0,1), false, "kPhong", "opaque");

    objects.push(triangle1_1);
    objects.push(triangle1_2); 

    a = vec3(pos2, pos1, pos3);
    b = vec3(pos1, pos1, pos3);
    c = vec3(pos1, pos2, pos3);
    d = vec3(pos2, pos2, pos3); // back wall
    

	var triangle1_1 = new Triangle(c, b, a, vec4(1, 1, 1), false, "kPhong", "opaque");
	var triangle1_2 = new Triangle(a, d, c, vec4(1, 1, 1), false, "kPhong", "opaque"); 

    objects.push(triangle1_1);
    objects.push(triangle1_2);

    a = vec3(pos1, pos1, pos4);
    b = vec3(pos1, pos1, pos3);
    c = vec3(pos2, pos1, pos3);
    d = vec3(pos2, pos1, pos4); // upper wall

    var triangle1_1 = new Triangle(c, b, a, vec4(1,1,1), false, "kPhong", "opaque");
    var triangle1_2 = new Triangle(a, d, c, vec4(1,1,1), false, "kPhong", "opaque");  

    objects.push(triangle1_1);
    objects.push(triangle1_2);

    a = vec3(pos1, pos2, pos4);
    b = vec3(pos1, pos2, pos3);
    c = vec3(pos2, pos2, pos3);
    d = vec3(pos2, pos2, pos4); // bottom wall

    var triangle1_1 = new Triangle(a, b, c, vec4(1,1,1), false, "kPhong", "opaque");
    var triangle1_2 = new Triangle(c, d, a, vec4(1,1,1), false, "kPhong", "opaque"); 

    objects.push(triangle1_1);
    objects.push(triangle1_2); 

	a = vec3(pos2, pos1, pos4);
    b = vec3(pos1, pos1, pos4);
    c = vec3(pos1, pos2, pos4);
    d = vec3(pos2, pos2, pos4); // camera side wall

    var triangle1_1 = new Triangle(a, b, c, vec4(1,0,0), false, "kPhong", "opaque");
    var triangle1_2 = new Triangle(c, d, a, vec4(1,0,0), false, "kPhong", "opaque"); 

    objects.push(triangle1_1);
    objects.push(triangle1_2); 


}

function reflect(I, N) 
{ 
	var product = multiply3VecCons(N, 2 * dot(I, N));

    return vec3(I[0] - product[0], I[1] - product[1], I[2] - product[2]); 
}


function multiply3VecCons(vector, constant) {

	return vec3(vector[0]*constant, vector[1]*constant, vector[2]*constant);
}

function multiply4VecCons(vector, constant) {

	return vec4(vector[0]*constant, vector[1]*constant, vector[2]*constant, vector[3]*constant);
}

function divide3VecCons(vecotr, constant) {
	return vec3(vector[0]/constant, vector[1]/constant, vector[2]/constant);
}

function divide4VecCons(vector, constant) {
	return vec4(vector[0]/constant, vector[1]/constant, vector[2]/constant, vector[3]/constant);
}