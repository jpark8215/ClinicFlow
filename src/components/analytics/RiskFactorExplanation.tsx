import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Lightbulb,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { RiskFactor, NoShowPrediction, NoShowPredictionInput } from '@/types/aiml';
import { riskFactorAnalysisService } from '@/services/riskFactorAnalysis';

interface RiskFactorExplanationProps {
  prediction: NoShowPrediction;
  input: NoShowPredictionInput;
  features?: number[];
  className?: string;
}

interface CounterfactualExplanation {
  change: string;
  newRisk: number;
  impact: number;
}

export const RiskFactorExplanation: React.FC<RiskFactorExplanationProps> = ({
  prediction,
  input,
  features = [],
  className = ''
}) => {
  const [selectedFactor, setSelectedFactor] = useState<RiskFactor | null>(null);

  // Generate counterfactual explanations
  const counterfactuals = useMemo(() => {
    return riskFactorAnalysisService.generateCounterfactualExplanations(input, prediction.riskScore);
  }, [input, prediction.riskScore]);

  // Generate risk factor summary
  const riskSummary = useMemo(() => {
    return riskFactorAnalysisService.generateRiskFactorSummary(prediction.factors);
  }, [prediction.factors]);

  // Generate intervention recommendations
  const interventions = useMemo(() => {
    return riskFactorAnalysisService.generateInterventionRecommendations(prediction.factors, prediction.riskScore);
  }, [prediction.factors, prediction.riskScore]);

  // Get risk level color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get impact color
  const getImpactColor = (impact: number) => {
    if (impact > 0.2) return 'bg-red-500';
    if (impact > 0.1) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Format percentage
  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Risk Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Risk Assessment Overview</span>
            </CardTitle>
            <Badge className={getRiskColor(prediction.riskLevel)}>
              {formatPercentage(prediction.riskScore)} Risk
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Risk Score</span>
                <span className="text-sm text-gray-600">{formatPercentage(prediction.riskScore)}</span>
              </div>
              <Progress value={prediction.riskScore * 100} className="h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{prediction.riskLevel.toUpperCase()}</div>
              <div className="text-sm text-gray-600">Risk Level</div>
            </div>
          </div>
          
          {prediction.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">{prediction.explanation}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="factors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="factors">Risk Factors</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="counterfactuals">What If</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Risk Factors Tab */}
        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Contributing Risk Factors</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Factors are ranked by their impact on the no-show prediction
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prediction.factors.map((factor, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFactor?.factor === factor.factor
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFactor(selectedFactor?.factor === factor.factor ? null : factor)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{factor.factor}</span>
                          <Badge variant="outline" className="text-xs">
                            Rank #{index + 1}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{factor.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-gray-900">
                          {formatPercentage(factor.impact)}
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getImpactColor(factor.impact)}`}
                            style={{ width: `${Math.min(factor.impact * 500, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interventions Tab */}
        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Recommended Interventions</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Actions you can take to reduce no-show risk
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interventions.map((intervention, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge 
                            variant={intervention.priority === 'high' ? 'destructive' : 
                                   intervention.priority === 'medium' ? 'default' : 'secondary'}
                          >
                            {intervention.priority.toUpperCase()} PRIORITY
                          </Badge>
                          <Badge variant="outline">
                            {intervention.effort.toUpperCase()} EFFORT
                          </Badge>
                        </div>
                        <h4 className="font-medium text-gray-900">{intervention.intervention}</h4>
                        <p className="text-sm text-gray-600 mt-1">Timeline: {intervention.timeline}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          -{formatPercentage(intervention.estimatedImpact)}
                        </div>
                        <div className="text-xs text-gray-500">Est. Impact</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Counterfactuals Tab */}
        <TabsContent value="counterfactuals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5" />
                <span>What If Scenarios</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                How different changes would affect the risk score
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {counterfactuals.map((scenario, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{scenario.change}</h4>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-gray-600">
                            Current Risk: {formatPercentage(prediction.riskScore)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-medium">
                            New Risk: {formatPercentage(scenario.newRisk)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-green-600">
                          <TrendingDown className="h-4 w-4" />
                          <span className="font-bold">{formatPercentage(Math.abs(scenario.impact))}</span>
                        </div>
                        <div className="text-xs text-gray-500">Reduction</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {riskSummary.riskCategory.replace('_', ' ').toUpperCase()}
                  </div>
                  <p className="text-sm text-gray-600">
                    Primary risk type based on contributing factors
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatPercentage(riskSummary.totalImpact)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Combined impact of all risk factors
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Primary vs Secondary Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Factor Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                  Primary Risk Factors
                </h4>
                <div className="space-y-2">
                  {riskSummary.primaryFactors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{factor.factor}</span>
                      <span className="font-medium text-red-600">{formatPercentage(factor.impact)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {riskSummary.secondaryFactors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 text-yellow-600 mr-2" />
                    Secondary Risk Factors
                  </h4>
                  <div className="space-y-2">
                    {riskSummary.secondaryFactors.map((factor, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{factor.factor}</span>
                        <span className="font-medium text-yellow-600">{formatPercentage(factor.impact)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskFactorExplanation;