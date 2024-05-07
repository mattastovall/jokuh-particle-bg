import React, { useMemo } from 'react';
import { Vector3 } from "three"
import { ARM_X_DIST, SPIRAL } from './components/config/galaxyConfig'

export function gaussianRandom(mean=0, stdev=1) {
    let u = 1 - Math.random()
    let v = Math.random()
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)

    return z * stdev + mean
}

export function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value))
}

export function spiral(x, y, z, offset) {
    // Implementation of the spiral function
    let r = Math.sqrt(x**2 + y**2)
    let theta = Math.atan2(y, x) + offset
    theta += (r/ARM_X_DIST) * SPIRAL
    return new Vector3(r*Math.cos(theta), r*Math.sin(theta), z) // Modify as per the actual logic
}
