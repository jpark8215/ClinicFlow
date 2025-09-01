import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Star, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { schedulingOptimizationService } from '@/services/schedulingOptimizationService';
import { 
  AppointmentRequest, 
  TimeSlot, 
  SchedulingConstraints,
  AIServiceResponse
} from '@/types/aiml';

interface OptimalTimeSlotSuggestionsProps {
  providerId: string;
  appointmentRequests: AppointmentRequest[];
  constraints: SchedulingConstraints;
}

interface SuggestionResult {
  appointmentRequest: AppointmentRequest;
  suggestions: TimeSlot[];
  isLoading: boolean;
  error?: string;
}

export const OptimalTimeSlotSuggestions: React.FC<OptimalTimeSlotSuggestionsProps> = ({
  providerId,
  appointmentRequests,
  constraints
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Initialize suggestions state
    setSuggestions(
      appointmentRequests.map(request => ({
        appointmentRequest: request,
        suggestions: [],
        isLoading: false
      }))
    );
  }, [appointmentRequests]);

  const generateSuggestions = async (requestIndex: number) => {
    const request = appointmentRequests[requestIndex];
    if (!request) return;

    // Update loading state
    setSuggestions(prev => prev.map((item, index) => 
      index === requestIndex 
        ? { ...item, isLoading: true, error: undefined }
        : item
    ));

    try {
      const dateRange = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      };

      const response = await schedulingOptimizationService.suggestOptimalTimeSlots(
        request,
        providerId,
        dateRange,
        constraints,
        5 // Max 5 suggestions
      );

      if (response.success && response.data) {
        setSuggestions(prev => prev.map((item, index) => 
          index === requestIndex 
            ? { ...item, suggestions: response.data!, isLoading: false }
            : item
        ));
      } else {
        setSuggestions(prev => prev.map((item, index) => 
          index === requestIndex 
            ? { ...item, isLoading: false, error: response.error || 'Failed to generate suggestions' }
            : item
        ));
      }
    } catch (error) {
      setSuggestions(prev => prev.map((item, index) => 
        index === requestIndex 
          ? { 
              ...item, 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          : item
      ));
    }
  };

  const generateAllSuggestions = async () => {
    setIsGenerating(true);
    
    try {
      // Generate suggestions for all requests in parallel
      const promises = appointmentRequests.map((_, index) => generateSuggestions(index));
      await Promise.all(promises);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPreferenceColor = (preference: number) => {
    if (preference >= 8) return 'text-green-600 bg-green-100';
    if (preference >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Optimal Time Slot Suggestions</h3>
          <p className="text-gray-600">AI-powered recommendations for each appointment request</p>
        </div>
        <Button 
          onClick={generateAllSuggestions}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate All Suggestions'}
        </Button>
      </div>

      {/* Suggestions for each appointment request */}
      <div className="space-y-4">
        {suggestions.map((suggestionResult, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Patient {suggestionResult.appointmentRequest.patientId}
                    </CardTitle>
                    <CardDescription>
                      {suggestionResult.appointmentRequest.appointmentType} • {suggestionResult.appointmentRequest.duration} min
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(suggestionResult.appointmentRequest.priority)}>
                    {suggestionResult.appointmentRequest.priority}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSuggestions(index)}
                    disabled={suggestionResult.isLoading}
                  >
                    {suggestionResult.isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Patient Preferences */}
              {suggestionResult.appointmentRequest.preferredTimes && 
               suggestionResult.appointmentRequest.preferredTimes.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Patient Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestionResult.appointmentRequest.preferredTimes.map((pref, prefIndex) => (
                      <div key={prefIndex} className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-800">
                          {formatDate(pref.startTime)} at {formatTime(pref.startTime)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {pref.preference}/10
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error State */}
              {suggestionResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{suggestionResult.error}</AlertDescription>
                </Alert>
              )}

              {/* Loading State */}
              {suggestionResult.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Generating optimal time slot suggestions...</span>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {!suggestionResult.isLoading && !suggestionResult.error && (
                <>
                  {suggestionResult.suggestions.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Recommended Time Slots
                      </h4>
                      <div className="grid gap-3">
                        {suggestionResult.suggestions.map((suggestion, sugIndex) => (
                          <div 
                            key={sugIndex}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">#{sugIndex + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {formatDate(suggestion.startTime)} at {formatTime(suggestion.startTime)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getPreferenceColor(suggestion.preference)}>
                                {suggestion.preference}/10
                              </Badge>
                              <Button variant="outline" size="sm">
                                Schedule
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No Suggestions Available
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Click the refresh button to generate optimal time slot suggestions
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => generateSuggestions(index)}
                        disabled={suggestionResult.isLoading}
                      >
                        Generate Suggestions
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      {suggestions.some(s => s.suggestions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Suggestions Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {suggestions.filter(s => s.suggestions.length > 0).length}
                </p>
                <p className="text-sm text-gray-600">Requests with Suggestions</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {suggestions.reduce((sum, s) => sum + s.suggestions.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Suggestions</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {suggestions.length > 0 ? 
                    Math.round(
                      suggestions
                        .filter(s => s.suggestions.length > 0)
                        .reduce((sum, s) => sum + Math.max(...s.suggestions.map(sg => sg.preference)), 0) / 
                      suggestions.filter(s => s.suggestions.length > 0).length
                    ) : 0
                  }
                </p>
                <p className="text-sm text-gray-600">Avg. Quality Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};