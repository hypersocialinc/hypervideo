/**
 * WebGL Shaders for Stacked Alpha Video Compositing
 *
 * The stacked alpha technique stores color in the top half of the video
 * and the alpha mask in the bottom half. The fragment shader samples
 * both halves and combines them to produce transparent video output.
 */

export const vertexShaderSource = `
  attribute vec4 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = a_position;
    v_texCoord = a_texCoord;
  }
`;

export const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_frame;
  varying vec2 v_texCoord;

  void main() {
    // Sample color from top half (y: 0.0 - 0.5)
    vec2 colorCoord = vec2(v_texCoord.x, v_texCoord.y * 0.5);

    // Sample alpha from bottom half (y: 0.5 - 1.0)
    vec2 alphaCoord = vec2(v_texCoord.x, 0.5 + v_texCoord.y * 0.5);

    vec4 color = texture2D(u_frame, colorCoord);
    float alpha = texture2D(u_frame, alphaCoord).r;

    gl_FragColor = vec4(color.rgb, alpha);
  }
`;
