import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Brain, Send, Loader, ArrowRight } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const AIAssistant = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'مرحباً! أنا مساعد الذكاء الاصطناعي الخاص بورشتك. يمكنني مساعدتك في:\n\n• إيجاد حلول للمشاكل الميكانيكية\n• البحث عن قطع الغيار\n• تقديم نصائح الصيانة\n• الإجابة على الاستفسارات الفنية\n\nكيف يمكنني مساعدتك اليوم؟'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    // Mock AI response
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: 'شكراً لسؤالك! حالياً أنا في وضع التجربة. سيتم ربطي بـ Claude AI قريباً لتقديم إجابات دقيقة ومفيدة. \n\nبعض النصائح العامة:\n• تأكد من فحص السوائل بانتظام\n• استخدم قطع غيار أصلية\n• اتبع جدول الصيانة الدورية\n\nهل لديك سؤال آخر؟'
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="hover:bg-slate-100 transition-colors"
          >
            <ArrowRight size={20} />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">مساعد الذكاء الاصطناعي</h1>
            <p className="text-slate-600">اسأل عن أي شيء متعلق بالصيانة والإصلاح</p>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="shadow-xl mb-6" style={{ height: 'calc(100vh - 300px)' }}>
          <CardHeader className="bg-gradient-to-l from-purple-50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <div className="bg-purple-600 p-2 rounded-full">
                <Brain className="text-white" size={20} />
              </div>
              Claude AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-2xl shadow-md ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-white text-slate-800 border border-slate-200 p-4 rounded-2xl shadow-md">
                    <Loader className="animate-spin" size={20} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Input Form */}
        <Card className="shadow-xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="اكتب سؤالك هنا... مثل: ما هو سبب ارتفاع حرارة المحرك؟"
                className="flex-1 min-h-24 border-slate-300 focus:border-purple-500 transition-colors resize-none"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Send className="ml-2" size={20} />
                إرسال
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistant;