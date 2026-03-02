-- Create reading_goals table for user goals
CREATE TABLE public.reading_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly')),
    target_pages INTEGER NOT NULL DEFAULT 0,
    target_books INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, goal_type)
);

-- Enable RLS
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reading_goals
CREATE POLICY "Users can view their own goals" ON public.reading_goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.reading_goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.reading_goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.reading_goals
FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_reading_goals_updated_at
BEFORE UPDATE ON public.reading_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create feedback table for suggestions/complaints
CREATE TABLE public.feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    email TEXT,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('suggestion', 'complaint', 'question', 'other')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback - anyone can insert (even anonymous)
CREATE POLICY "Anyone can submit feedback" ON public.feedback
FOR INSERT WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON public.feedback
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);