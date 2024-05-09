import React from 'react';
import { Html } from '@react-three/drei';

function NameText({ position, name }) {
    return (
        <Html position={position}>
            <p>{name}</p>
        </Html>
    );
}

export default NameText;

