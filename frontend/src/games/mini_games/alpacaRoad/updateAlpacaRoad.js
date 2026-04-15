import * as THREE from 'three';
import * as PRIMITIVES from '../../assets/primitives.js';
import { CONST } from '../../config/constants.js';
import { createAlpaca, createDecoration, createItem } from '../../core/createObjects.js';
import { gDecorations, gItems, gMinigame, gPlayer, gScene, gUI} from '../../core/globals.js';
import { attachCollider } from '../../core/useCollider.js';
import { usePhysics } from '../../core/usePhysics.js';
import { getRandomTimer } from '../../utils/randomValues.js';

