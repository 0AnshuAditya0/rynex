declare module "react-cytoscapejs" {
  import * as React from "react";
  import type { Core, ElementDefinition } from "cytoscape";

  type CytoscapeComponentProps = {
    elements: ElementDefinition[] | undefined;
    stylesheet?: any[];
    style?: React.CSSProperties;
    layout?: any;
    cy?: (cy: Core) => void;
    zoomingEnabled?: boolean;
    userZoomingEnabled?: boolean;
    panningEnabled?: boolean;
    boxSelectionEnabled?: boolean;
  };

  const CytoscapeComponent: React.ComponentType<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}
