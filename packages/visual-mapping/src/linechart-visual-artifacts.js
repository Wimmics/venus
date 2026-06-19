import { CartesianVisualArtifacts } from "./cartesian-visual-artifacts";


export class LineChartVisualArtifacts extends CartesianVisualArtifacts {

    _resolveChartLayoutExtras({ encoding }) {
        return { 
            pointsEnabled: encoding?.points && encoding?.points?.display !== false
        }
    }
}