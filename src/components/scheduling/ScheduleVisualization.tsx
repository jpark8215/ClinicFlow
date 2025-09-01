import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { OptimizedAppointment, SchedulingConstraints } from '@/types/aiml';

interface ScheduleVisualizationProps {
  schedule: OptimizedAppointment[];
  constraints: SchedulingConstraints;
}

export const ScheduleVisualization: React.FC<ScheduleVisualizationProps> = ({
  schedule,
  constraints
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // Generate time slots for the day
  const generateTimeSlots = () => {
    const slots = [];
    const [startHour, startMinute] = constraints.workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = constraints.workingHours.end.split(':').map(Number);
    
    const current = new Date();
    current.setHours(startHour, startMinute, 0, 0);
    
    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);
    
    while (current < end) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15); // 15-minute intervals
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Find appointment for a given time slot
  const findAppointmentForSlot = (slotTime: Date) => {
    return schedule.find(apt => {
      const aptTime = new Date(apt.scheduledTime);
      const aptEnd = new Date(aptTime.getTime() + apt.duration * 60000);
      return slotTime >= aptTime && slotTime < aptEnd;
    });
  };

  // Check if slot is a break time
  const isBreakTime = (slotTime: Date) => {
    return constraints.breakTimes.some(breakTime => {
      const breakStart = new Date(breakTime.startTime);
      const breakEnd = new Date(breakTime.endTime);
      return slotTime >= breakStart && slotTime < breakEnd;
    });
  };

  return (
    <div className="space-y-4">
      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-lg font-semibold text-blue-600">{schedule.length}</p>
          <p className="text-sm text-gray-600">Scheduled</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-lg font-semibold text-green-600">
            {schedule.filter(apt => apt.confidence >= 0.8).length}
          </p>
          <p className="text-sm text-gray-600">High Confidence</p>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <p className="text-lg font-semibold text-yellow-600">
            {schedule.filter(apt => apt.confidence >= 0.6 && apt.confidence < 0.8).length}
          </p>
          <p className="text-sm text-gray-600">Medium Confidence</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-lg font-semibold text-red-600">
            {schedule.filter(apt => apt.confidence < 0.6).length}
          </p>
          <p className="text-sm text-gray-600">Low Confidence</p>
        </div>
      </div>

      {/* Timeline View */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-1">
            {timeSlots.map((slot, index) => {
              const appointment = findAppointmentForSlot(slot);
              const isBreak = isBreakTime(slot);
              const isHourMark = slot.getMinutes() === 0;

              return (
                <div key={index} className="flex items-center">
                  {/* Time Label */}
                  <div className="w-20 text-sm text-gray-500 text-right pr-4">
                    {isHourMark && formatTime(slot)}
                  </div>

                  {/* Time Slot */}
                  <div className="flex-1 h-8 relative">
                    {isBreak ? (
                      <div className="h-full bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-600">Break</span>
                      </div>
                    ) : appointment ? (
                      <div className={`h-full rounded border-2 flex items-center px-3 ${getConfidenceColor(appointment.confidence)}`}>
                        <div className="flex items-center gap-2 flex-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm font-medium">
                            Patient {appointment.patientId}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {appointment.duration}min
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getConfidenceLabel(appointment.confidence)}
                        </Badge>
                      </div>
                    ) : (
                      <div className="h-full bg-gray-50 rounded border border-gray-200" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      {schedule.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointment Details
            </h4>
            <div className="space-y-3">
              {schedule.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Patient {appointment.patientId}</p>
                      <p className="text-sm text-gray-600">
                        {formatTime(new Date(appointment.scheduledTime))} • {appointment.duration} minutes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConfidenceColor(appointment.confidence)}>
                      {getConfidenceLabel(appointment.confidence)} ({Math.round(appointment.confidence * 100)}%)
                    </Badge>
                    {appointment.alternativeSlots && appointment.alternativeSlots.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {appointment.alternativeSlots.length} alternatives
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-200 rounded" />
              <span>High Confidence (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-200 rounded" />
              <span>Medium Confidence (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-200 rounded" />
              <span>Low Confidence (&lt;60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <span>Break Time</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};