import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, BookMarked } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RemediationChoiceProps {
  guideId: string;
  testId: string;
  submissionId: string;
  attemptNumber: number;
}

/**
 * Component that allows users to choose between quick review and comprehensive remediation
 * after multiple failed attempts at a test.
 */
const RemediationChoice: React.FC<RemediationChoiceProps> = ({
  guideId,
  testId,
  submissionId,
  attemptNumber,
}) => {
  const router = useRouter();

  return (
    <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg">
      <div className="flex items-start gap-4">
        <BookOpen className="h-8 w-8 text-amber-500 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-700 text-xl mb-2">
            Choose Your Learning Path
          </h3>
          <p className="text-amber-600 mb-4">
            {attemptNumber === 3
              ? "You've reached the maximum number of attempts (3) without achieving mastery."
              : `You need remediation after ${attemptNumber} attempts.`}
            Choose an option below to continue:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Card className="border-amber-200 bg-amber-50/70 hover:bg-amber-50 transition-all">
              <CardContent className="p-4">
                <h4 className="font-medium text-amber-800 text-lg mb-2">
                  Quick Review
                </h4>
                <p className="text-amber-600 mb-4 text-sm">
                  A brief overview of key concepts you should focus on. Choose
                  this if you want a quick refresher.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/practice/guide/slides/${guideId}/quiz/${testId}/review?submission=${submissionId}`
                    )
                  }
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Start Quick Review
                </Button>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/70 hover:bg-amber-50 transition-all">
              <CardContent className="p-4">
                <h4 className="font-medium text-amber-800 text-lg mb-2">
                  Comprehensive Remediation
                </h4>
                <p className="text-amber-600 mb-4 text-sm">
                  Detailed explanations and learning materials to help you
                  master the topic. Recommended for difficult concepts.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/practice/guide/slides/${guideId}/quiz/${testId}/remediation?submission=${submissionId}`
                    )
                  }
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <BookMarked className="mr-2 h-4 w-4" />
                  Start Full Remediation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemediationChoice;
