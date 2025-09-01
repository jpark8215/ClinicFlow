import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useNoShowPrediction } from '@/hooks/useNoShowPrediction';
import { NoShowPrediction } from '@/types/aiml';

interface NoShowRiskIndicatorProps {
  appointmentId: string;
  compact?: boolean;
  showDetails?: boolean;
  onInterventionClick?: (appointmentId: string) => void;
}

export const NoShowRiskIndicator: React.FC<NoShowRiskIndicatorProps> = ({
  appointmentId,
  compact = false,
  showDetails = false,
  onInterventionClick
}) => {
  const { prediction, isLoading, error } = useNoShowPrediction(appointmentId);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Brain className="h-4 w-4 animate-pulse text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Analyzing...</span>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              No Prediction
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unable to generate risk prediction</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (compact) {
    return <CompactRiskIndicator prediction={prediction} appointmentId={appointmentId} />;
  }

  return (
    <DetailedRiskIndicator 
      prediction={prediction} 
      appointmentId={appointmentId}
      showDetails={showDetails}
      onInterventionClick={onInterventionClick}
    />
  );
};

interface CompactRiskIndicatorProps {
  prediction: NoShowPrediction;
  appointmentId: string;
}

const CompactRiskIndicator: React.FC<CompactRiskIndicatorProps> = ({ prediction }) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="h-3 w-3" />;
      case 'medium': return <AlertCircle className="h-3 w-3" />;
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const riskPercentage = Math.round(prediction.riskScore * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className={`text-xs ${getRiskColor(prediction.riskLevel)}`}
          >
            {getRiskIcon(prediction.riskLevel)}
            <span className="ml-1">{riskPercentage}%</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">No-Show Risk: {prediction.riskLevel.toUpperCase()}</p>
            <p className="text-sm">{prediction.explanation}</p>
            {prediction.factors && prediction.factors.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Top Risk Factors:</p>
                <ul className="text-xs space-y-1">
                  {prediction.factors.slice(0, 3).map((factor, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{factor.factor}</span>
                      <span className="text-muted-foreground">
                        {Math.round(factor.impact * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface DetailedRiskIndicatorProps {
  prediction: NoShowPrediction;
  appointmentId: string;
  showDetails: boolean;
  onInterventionClick?: (appointmentId: string) => void;
}

const DetailedRiskIndicator: React.FC<DetailedRiskIndicatorProps> = ({
  prediction,
  appointmentId,
  showDetails,
  onInterventionClick
}) => {
  const riskPercentage = Math.round(prediction.riskScore * 100);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-blue-600" />
            <span>No-Show Risk Assessment</span>
          </div>
          <Badge 
            variant="outline" 
            className={`${getRiskColor(prediction.riskLevel)} border-current`}
          >
            {prediction.riskLevel.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Risk Score</span>
            <span className={`text-lg font-bold ${getRiskColor(prediction.riskLevel)}`}>
              {riskPercentage}%
            </span>
          </div>
          <Progress 
            value={riskPercentage} 
            className="h-2"
            // Note: You may need to add custom CSS for colored progress bars
          />
        </div>

        {/* Explanation */}
        {prediction.explanation && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">{prediction.explanation}</p>
          </div>
        )}

        {showDetails && (
          <>
            {/* Risk Factors */}
            {prediction.factors && prediction.factors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Risk Factors
                </h4>
                <div className="space-y-2">
                  {prediction.factors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{factor.factor}</p>
                        <p className="text-xs text-muted-foreground">{factor.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {Math.round(factor.impact * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recommendations</h4>
                <ul className="space-y-1">
                  {prediction.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start">
                      <span className="mr-2">•</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interventions */}
            {prediction.interventions && prediction.interventions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Suggested Interventions</h4>
                <div className="space-y-2">
                  {prediction.interventions.map((intervention, index) => (
                    <div key={index} className="p-2 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {intervention.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Impact: {Math.round(intervention.estimatedImpact * 100)}%
                        </span>
                      </div>
                      <p className="text-sm">{intervention.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            {onInterventionClick && prediction.riskLevel !== 'low' && (
              <Button 
                onClick={() => onInterventionClick(appointmentId)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Take Action
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NoShowRiskIndicator;