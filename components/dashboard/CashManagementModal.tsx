import React, { useEffect } from "react";
import { Modal, Form, InputNumber, Divider, Typography } from "antd";
import { CashData } from "./types";

const { Text } = Typography;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cashData: CashData;
    onUpdate: (data: CashData) => void;
}

export default function CashManagementModal({
    isOpen,
    onClose,
    cashData,
    onUpdate,
}: Props) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (isOpen) {
            form.setFieldsValue({
                deposit: cashData.deposit,
                cma: cashData.cma,
            });
        }
    }, [isOpen, cashData, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            onUpdate({
                deposit: values.deposit || 0,
                cma: values.cma || 0,
            });
            onClose();
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    return (
        <Modal
            title={<Text strong style={{ fontSize: 16 }}>현금 자산 관리</Text>}
            open={isOpen}
            onOk={handleOk}
            onCancel={onClose}
            okText="저장하기"
            cancelText="취소"
            width={400}
            centered
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ deposit: 0, cma: 0 }}
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="deposit"
                    label={<Text style={{ fontSize: 13, fontWeight: 600 }}>예수금 (D+2)</Text>}
                    rules={[{ required: true, message: '예수금을 입력해주세요' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        size="large"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                        addonAfter="원"
                    />
                </Form.Item>

                <Form.Item
                    name="cma"
                    label={<Text style={{ fontSize: 13, fontWeight: 600 }}>CMA / 기타 현금</Text>}
                    rules={[{ required: true, message: 'CMA 잔액을 입력해주세요' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        size="large"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                        addonAfter="원"
                    />
                </Form.Item>

                <Divider style={{ margin: '12px 0' }} />

                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                    <Text type="secondary" style={{ fontSize: 13 }}>총 현금 자산</Text>
                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldsValue }) => {
                            const { deposit = 0, cma = 0 } = getFieldsValue();
                            return (
                                <Text strong style={{ fontSize: 18, color: '#003a8c' }}>
                                    {(deposit + cma).toLocaleString()}원
                                </Text>
                            );
                        }}
                    </Form.Item>
                </div>
            </Form>
        </Modal>
    );
}
;
